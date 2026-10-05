from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database import models
from app.auth import get_current_user


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


# =========================================================
# ADMIN CHECK
# =========================================================

def get_current_admin(
    current_user=Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# =========================================================
# ALL USERS
# =========================================================

@router.get("/users")
def get_all_users(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    users = db.query(models.User).order_by(
        models.User.created_at.desc()
    ).all()

    result = []

    for user in users:

        result.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_verified": user.is_verified,
            "created_at": user.created_at
        })

    return {
        "users": result,
        "total_users": len(result)
    }


# =========================================================
# USER DETAILS
# =========================================================

@router.get("/users/{user_id}")
def get_user_details(
    user_id: int,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    wallet = db.query(
        models.Wallet
    ).filter(
        models.Wallet.user_id == user_id
    ).first()

    subscription = db.query(
        models.Subscription
    ).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.status == "active"
    ).order_by(
        models.Subscription.created_at.desc()
    ).first()

    documents = db.query(
        models.Document
    ).filter(
        models.Document.user_id == user_id
    ).count()

    connections = db.query(
        models.Connection
    ).filter(
        (
            (models.Connection.sender_id == user_id) |
            (models.Connection.receiver_id == user_id)
        ),
        models.Connection.status == "accepted"
    ).count()

    calls = db.query(
        models.Call
    ).filter(
        (
            (models.Call.caller_id == user_id) |
            (models.Call.receiver_id == user_id)
        )
    ).count()

    ai_questions = db.query(
        models.AIQuestion
    ).filter(
        models.AIQuestion.user_id == user_id
    ).count()

    return {

        "user": {
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_verified": user.is_verified,
            "created_at": user.created_at
        },

        "wallet": {
            "balance": wallet.balance if wallet else 0
        },

        "subscription": (
            {
                "plan_name": subscription.plan_name,
                "credits": subscription.credits,
                "amount": subscription.amount,
                "status": subscription.status,
                "created_at": subscription.created_at
            }
            if subscription
            else None
        ),

        "statistics": {
            "documents": documents,
            "connections": connections,
            "calls": calls,
            "ai_questions": ai_questions
        }
    }


# =========================================================
# SUBSCRIPTIONS
# =========================================================

@router.get("/subscriptions")
def get_all_subscriptions(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    subscriptions = db.query(
        models.Subscription
    ).order_by(
        models.Subscription.created_at.desc()
    ).all()

    result = []

    for subscription in subscriptions:

        user = db.query(
            models.User
        ).filter(
            models.User.id == subscription.user_id
        ).first()

        result.append({

            "subscription_id": subscription.id,

            "user_id": subscription.user_id,

            "user_name":
                user.full_name
                if user
                else "Unknown",

            "plan_name": subscription.plan_name,

            "credits": subscription.credits,

            "amount": subscription.amount,

            "status": subscription.status,

            "created_at": subscription.created_at
        })

    return {
        "subscriptions": result
    }


# =========================================================
# WALLETS
# =========================================================

@router.get("/wallets")
def get_all_wallets(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    wallets = db.query(
        models.Wallet
    ).order_by(
        models.Wallet.balance.desc()
    ).all()

    result = []

    for wallet in wallets:

        user = db.query(
            models.User
        ).filter(
            models.User.id == wallet.user_id
        ).first()

        result.append({

            "user_id": wallet.user_id,

            "user_name":
                user.full_name
                if user
                else "Unknown",

            "email":
                user.email
                if user
                else "Unknown",

            "balance": wallet.balance
        })

    return {
        "wallets": result
    }


# =========================================================
# DOCUMENTS
# =========================================================

@router.get("/documents")
def get_all_documents(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    documents = db.query(
        models.Document
    ).order_by(
        models.Document.created_at.desc()
    ).all()

    result = []

    for document in documents:

        user = db.query(
            models.User
        ).filter(
            models.User.id == document.user_id
        ).first()

        result.append({

            "document_id": document.id,

            "file_name": document.file_name,

            "user_id": document.user_id,

            "user_name":
                user.full_name
                if user
                else "Unknown",

            "created_at": document.created_at
        })

    return {
        "documents": result
    }


# =========================================================
# CONNECTIONS
# =========================================================

@router.get("/connections")
def get_all_connections(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    connections = db.query(
        models.Connection
    ).order_by(
        models.Connection.created_at.desc()
    ).all()

    result = []

    for connection in connections:

        sender = db.query(
            models.User
        ).filter(
            models.User.id == connection.sender_id
        ).first()

        receiver = db.query(
            models.User
        ).filter(
            models.User.id == connection.receiver_id
        ).first()

        result.append({

            "connection_id": connection.id,

            "sender_id": connection.sender_id,

            "sender_name":
                sender.full_name
                if sender
                else "Unknown",

            "receiver_id": connection.receiver_id,

            "receiver_name":
                receiver.full_name
                if receiver
                else "Unknown",

            "status": connection.status,

            "created_at": connection.created_at
        })

    return {
        "connections": result
    }


# =========================================================
# CALL HISTORY
# =========================================================

@router.get("/calls")
def get_all_calls(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    calls = db.query(
        models.Call
    ).order_by(
        models.Call.created_at.desc()
    ).all()

    result = []

    for call in calls:

        caller = db.query(
            models.User
        ).filter(
            models.User.id == call.caller_id
        ).first()

        receiver = db.query(
            models.User
        ).filter(
            models.User.id == call.receiver_id
        ).first()

        result.append({

            "call_id": call.id,

            "caller_id": call.caller_id,

            "caller_name":
                caller.full_name
                if caller
                else "Unknown",

            "receiver_id": call.receiver_id,

            "receiver_name":
                receiver.full_name
                if receiver
                else "Unknown",

            "started_at": call.started_at,

            "ended_at": call.ended_at,

            "duration": call.duration
        })

    return {
        "calls": result
    }


# =========================================================
# AI USAGE
# =========================================================

@router.get("/usage")
def get_ai_usage(
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):

    questions = db.query(
        models.AIQuestion
    ).order_by(
        models.AIQuestion.created_at.desc()
    ).all()

    result = []

    for question in questions:

        user = db.query(
            models.User
        ).filter(
            models.User.id == question.user_id
        ).first()

        document = db.query(
            models.Document
        ).filter(
            models.Document.id == question.document_id
        ).first()

        result.append({

            "question_id": question.id,

            "user_id": question.user_id,

            "user_name":
                user.full_name
                if user
                else "Unknown",

            "document_id":
                question.document_id,

            "document_name":
                document.file_name
                if document
                else "Unknown",

            "question": question.question,

            "answer": question.answer,

            "created_at": question.created_at
        })

    return {

        "usage": result,

        "total_questions": len(result)

    }