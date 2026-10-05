from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import models
from app.database.database import get_db
from app.auth import get_current_user


router = APIRouter(
    prefix="/api",
    tags=["Wallet"]
)


@router.get("/wallet")
def get_wallet(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    wallet = db.query(models.Wallet).filter(
        models.Wallet.user_id == user_id
    ).first()

    if not wallet:
        return {
            "balance": 0
        }

    return {
        "balance": wallet.balance
    }




@router.get("/wallet/transactions")
def get_wallet_transactions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    transactions = db.query(
        models.WalletTransaction
    ).filter(
        models.WalletTransaction.user_id == user_id
    ).order_by(
        models.WalletTransaction.created_at.desc()
    ).all()

    return {
        "transactions": transactions
    }