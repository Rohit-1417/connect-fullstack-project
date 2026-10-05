from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import get_db
from app.schemas.subscription import SubscribeRequest
from app.auth import get_current_user

router = APIRouter(
    prefix="/api",
    tags=["Subscriptions"]
)


@router.get("/subscriptions")
def get_subscriptions():
    return {
        "plans": [
            {
                "name": "Basic",
                "amount": 199,
                "credits": 500
            },
            {
                "name": "Premium",
                "amount": 499,
                "credits": 1500
            }
        ]
    }



@router.post("/subscribe")
def subscribe(
    data: SubscribeRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = {
        "Basic": {
            "amount": 199,
            "credits": 500
        },
        "Premium": {
            "amount": 499,
            "credits": 1500
        }
    }

    plan = plans.get(data.plan_name)

    if not plan:
        raise HTTPException(
            status_code=400,
            detail="Invalid subscription plan"
        )

    user_id = current_user["user_id"]

    wallet = db.query(models.Wallet).filter(
    models.Wallet.user_id == user_id
    ).first()

    if not wallet:
        wallet = models.Wallet(
        user_id=user_id,
        balance=0
    )

    db.add(wallet)
    db.flush()

    wallet.balance += plan["credits"]


    transaction = models.WalletTransaction(
    user_id=user_id,
    amount=plan["credits"],
    transaction_type="credit",
    description=f"{data.plan_name} plan purchased"
    )

    db.add(transaction)

    subscription = models.Subscription(
        user_id=user_id,
        plan_name=data.plan_name,
        credits=plan["credits"],
        amount=plan["amount"],
        status="active"
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return {
        "message": "Subscription successful",
        "plan": data.plan_name,
        "amount": plan["amount"],
        "credits": plan["credits"]
    }




@router.get("/subscription")
def get_my_subscription(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    subscription = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.status == "active"
    ).order_by(
        models.Subscription.created_at.desc()
    ).first()

    if not subscription:
        return {
            "active": False,
            "message": "No active subscription"
        }

    return {
        "active": True,
        "plan_name": subscription.plan_name,
        "credits": subscription.credits,
        "amount": subscription.amount,
        "status": subscription.status,
        "created_at": subscription.created_at
    }