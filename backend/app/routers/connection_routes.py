from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session
from app.schemas.user import UserListResponse
from app.schemas.connection import ConnectionRequest,ConnectionResponse
from app.database import models
from app.database.database import get_db
from app.auth import get_current_user


router = APIRouter(
    prefix="/api",
    tags=["Connections"]
)




@router.get(
    "/users",
    response_model=list[UserListResponse]
)
def get_users(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).filter(
        models.User.id != current_user["user_id"]
    ).all()

    return users





@router.post("/connect")
def send_connection_request(
    data: ConnectionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sender_id = current_user["user_id"]

    if sender_id == data.receiver_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a connection request to yourself"
        )

    receiver = db.query(models.User).filter(
    models.User.id == data.receiver_id
    ).first()

    if not receiver:
        raise HTTPException(
        status_code=404,
        detail="User not found"
    )

    existing_connection = db.query(models.Connection).filter(
    (
        (models.Connection.sender_id == sender_id) &
        (models.Connection.receiver_id == data.receiver_id)
    ) |
    (
        (models.Connection.sender_id == data.receiver_id) &
        (models.Connection.receiver_id == sender_id)
    )
    ).first()

    if existing_connection:
        raise HTTPException(
        status_code=400,
        detail="Connection request already exists"
    )


    new_connection = models.Connection(
    sender_id=sender_id,
    receiver_id=data.receiver_id,
    status="pending"
    )

    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)

    return {
    "message": "Connection request sent successfully",
    "connection_id": new_connection.id
}





@router.get(
    "/connections/requests",
    response_model=list[ConnectionResponse]
)
def get_connection_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    requests = db.query(
        models.Connection.id,
        models.Connection.sender_id,
        models.User.full_name,
        models.Connection.status
    ).join(
        models.User,
        models.Connection.sender_id == models.User.id
    ).filter(
        models.Connection.receiver_id == user_id,
        models.Connection.status == "pending"
    ).all()

    return [
        {
            "connection_id": request.id,
            "sender_id": request.sender_id,
            "sender_name": request.full_name,
            "status": request.status
        }
        for request in requests
    ]





@router.post("/connections/{connection_id}/accept")
def accept_connection(
    connection_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    # Find the connection request
    connection = db.query(models.Connection).filter(
        models.Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )

    # Check if the request is still pending
    if connection.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Connection request is no longer pending"
        )

    # Only the receiver can accept the request
    if connection.receiver_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to accept this connection request"
        )

    # Accept the connection
    connection.status = "accepted"

    db.commit()

    return {
        "message": "Connection request accepted",
        "connection_id": connection.id
    }






@router.post("/connections/{connection_id}/reject")
def reject_connection(
    connection_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    # Find the connection request
    connection = db.query(models.Connection).filter(
        models.Connection.id == connection_id
    ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Connection request not found"
        )

    # Check if the request is still pending
    if connection.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Connection request is no longer pending"
        )

    # Only the receiver can reject the request
    if connection.receiver_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to reject this connection request"
        )

    # Reject the connection
    connection.status = "rejected"

    db.commit()

    return {
        "message": "Connection request rejected",
        "connection_id": connection.id
    }






@router.get("/connections")
def get_connections(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    connections = db.query(models.Connection).filter(
        (
            (models.Connection.sender_id == user_id) |
            (models.Connection.receiver_id == user_id)
        ) &
        (models.Connection.status == "accepted")
    ).all()

    result = []

    for connection in connections:
        if connection.sender_id == user_id:
            other_user_id = connection.receiver_id
        else:
            other_user_id = connection.sender_id

        other_user = db.query(models.User).filter(
            models.User.id == other_user_id
        ).first()

        result.append({
            "user_id": other_user.id,
            "full_name": other_user.full_name,
            "connection_id": connection.id
        })

    return {
        "connections": result
    }