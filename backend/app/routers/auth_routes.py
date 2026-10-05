from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.database import models
from app.database.database import get_db
from app.schemas.user import UserRegister,OTPVerify,UserLogin,ForgotPasswordRequest,ForgotPasswordVerify,ResetPassword
from app.auth import hash_password,verify_password,create_access_token,get_current_user,create_reset_token,get_password_reset_user
from app.otp import generate_otp
from app.email_service import send_otp_email,send_password_changed_email


router = APIRouter(
    prefix="/api",
    tags=["Authentication"]
)


@router.post("/registration")
def user_create(
    user: UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Check if email already exists
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email Already Registered"
        )

    # Hash password
    hashed_password = hash_password(user.password)

    # Generate OTP
    otp = generate_otp()

    # OTP valid for 5 minutes
    otp_expiry = datetime.utcnow() + timedelta(minutes=5)

    # Create new user
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hashed_password,
        role="user",
        otp=otp,
        otp_expiry=otp_expiry,
        is_verified=False
    )

    # Save user to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send OTP email in background
    background_tasks.add_task(
        send_otp_email,
        user.email,
        otp
    )

    return {
        "message": "Registration successful",
        "user_id": new_user.id
    }







@router.post("/verify-otp")
def verify_otp(
    data: OTPVerify,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="User is already verified"
        )

    if user.otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if user.otp_expiry is None or user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    user.is_verified = True
    user.otp = None
    user.otp_expiry = None

    db.commit()

    return {
        "message": "Email verified successfully"
    }





@router.post("/login")
def login_user(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    # Find user by email
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check password
    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check email verification
    if not existing_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first"
        )

    access_token = create_access_token({
    "user_id": existing_user.id,
    "email": existing_user.email,
    "role": existing_user.role
    })

    return {
    "message": "Login successful",
    "access_token": access_token,
    "token_type": "bearer"
}






@router.get("/profile")
def get_profile(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.id == payload["user_id"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "You are authorized",
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role
    }



@router.post("/forget-password")
def forget_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User Not Found"
        )

    otp = generate_otp()

    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)

    db.commit()

    background_tasks.add_task(
        send_otp_email,
        user.email,
        otp
    )

    return {
        "message": "OTP sent to your email."
    }



@router.post("/forget-password/verify-otp")
def verify_forgot_password_otp(
    data: ForgotPasswordVerify,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User Not Found"
        )

    if user.otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if user.otp_expiry is None or user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    # OTP is correct, so create password reset token
    reset_token = create_reset_token(user.id)

    # OTP is no longer needed
    user.otp = None
    user.otp_expiry = None

    db.commit()

    return {
        "message": "OTP verified successfully",
        "reset_token": reset_token
    }





@router.post("/reset-password")
def reset_password(
    data: ResetPassword,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_password_reset_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.password_hash = hash_password(data.new_password)

    db.commit()

    background_tasks.add_task(
        send_password_changed_email,
        user.email
    )

    return {
        "message": "Password reset successfully"
    }