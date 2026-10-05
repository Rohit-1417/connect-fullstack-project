from fastapi import APIRouter, Depends , HTTPException , WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import models
from app.database.database import get_db,SessionLocal
from app.auth import get_current_user,verify_token



class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        websocket = self.active_connections.get(user_id)

        if websocket:
            await websocket.send_json(message)


manager = ConnectionManager()



router = APIRouter(
    prefix="/api",
    tags=["Calls"]
)




@router.post("/calls")
def start_call(
    receiver_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    caller_id = current_user["user_id"]

    # Prevent calling yourself
    if caller_id == receiver_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot call yourself"
        )

    # Check that the receiver exists
    receiver = db.query(models.User).filter(
        models.User.id == receiver_id
    ).first()

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Check that the two users are connected
    connection = db.query(models.Connection).filter(
        (
            (models.Connection.sender_id == caller_id) &
            (models.Connection.receiver_id == receiver_id)
        ) |
        (
            (models.Connection.sender_id == receiver_id) &
            (models.Connection.receiver_id == caller_id)
        ),
        models.Connection.status == "accepted"
    ).first()

    if not connection:
        raise HTTPException(
            status_code=403,
            detail="You can only call an accepted connection"
        )

    # Create call record
    call = models.Call(
        caller_id=caller_id,
        receiver_id=receiver_id,
        started_at=datetime.now(timezone.utc)
    )

    db.add(call)
    db.commit()
    db.refresh(call)

    return {
        "message": "Call started",
        "call_id": call.id,
        "caller_id": call.caller_id,
        "receiver_id": call.receiver_id,
        "started_at": call.started_at
    }





@router.post("/calls/{call_id}/end")
def end_call(
    call_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    # 1. Find the call
    call = db.query(models.Call).filter(
        models.Call.id == call_id
    ).first()

    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found"
        )

    # 2. Check that the user belongs to this call
    if call.caller_id != user_id and call.receiver_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this call"
        )

    # 3. Check whether the call is already ended
    if call.ended_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Call has already ended"
        )

    # 4. Set ending time
    ended_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # 5. Calculate duration in seconds
    duration = int(
        (ended_at - call.started_at).total_seconds()
    )

    # 6. Update call
    call.ended_at = ended_at
    call.duration = duration

    db.commit()
    db.refresh(call)

    return {
        "message": "Call ended",
        "call_id": call.id,
        "started_at": call.started_at,
        "ended_at": call.ended_at,
        "duration": call.duration
    }





@router.get("/calls/history")
def get_call_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    calls = db.query(models.Call).filter(
        (models.Call.caller_id == user_id) |
        (models.Call.receiver_id == user_id)
    ).order_by(
        models.Call.created_at.desc()
    ).all()

    result = []

    for call in calls:

        if call.caller_id == user_id:
            other_user_id = call.receiver_id
        else:
            other_user_id = call.caller_id

        other_user = db.query(models.User).filter(
            models.User.id == other_user_id
        ).first()

        result.append({
            "call_id": call.id,
            "other_user_id": other_user.id,
            "other_user_name": other_user.full_name,
            "started_at": call.started_at,
            "ended_at": call.ended_at,
            "duration": call.duration
        })

    return {
        "calls": result
    }




@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str
):
    # ==============================================
    # VERIFY JWT TOKEN
    # ==============================================

    payload = verify_token(token)

    if payload is None:
        await websocket.close(code=1008)
        return

    # Do not allow password reset token
    if payload.get("type") == "password_reset":
        await websocket.close(code=1008)
        return

    user_id = payload.get("user_id")

    if not user_id:
        await websocket.close(code=1008)
        return

    user_id = int(user_id)


    # ==============================================
    # DATABASE SESSION
    # ==============================================

    db = SessionLocal()

    try:

        await manager.connect(
            user_id,
            websocket
        )


        # ==========================================
        # RECEIVE SIGNALS
        # ==========================================

        while True:

            data = await websocket.receive_json()

            target_user_id = data.get(
                "target_user_id"
            )

            if not target_user_id:

                await websocket.send_json({
                    "error":
                        "target_user_id is required"
                })

                continue

            target_user_id = int(
                target_user_id
            )


            # ======================================
            # PREVENT CALLING / SIGNALING YOURSELF
            # ======================================

            if target_user_id == user_id:

                await websocket.send_json({
                    "error":
                        "You cannot signal yourself"
                })

                continue


            # ======================================
            # CHECK ACCEPTED CONNECTION
            # ======================================

            connection = db.query(
                models.Connection
            ).filter(
                (
                    (
                        models.Connection.sender_id == user_id
                    )
                    &
                    (
                        models.Connection.receiver_id == target_user_id
                    )
                )
                |
                (
                    (
                        models.Connection.sender_id == target_user_id
                    )
                    &
                    (
                        models.Connection.receiver_id == user_id
                    )
                ),
                models.Connection.status == "accepted"
            ).first()


            if not connection:

                await websocket.send_json({
                    "error":
                        "You can only communicate with an accepted connection"
                })

                continue


            # ======================================
            # PREPARE SIGNAL
            # ======================================

            message = {

                "from_user_id": user_id,

                "type": data.get("type"),

                "data": data.get("data")

            }


            # ======================================
            # SEND TO TARGET USER
            # ======================================

            await manager.send_to_user(
                target_user_id,
                message
            )


    except WebSocketDisconnect:

        manager.disconnect(
            user_id
        )

    finally:

        db.close()