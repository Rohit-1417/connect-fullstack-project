from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.database import models
from app.auth import hash_password


def create_admin():

    db: Session = SessionLocal()

    try:

        name = input("Admin name: ").strip()
        email = input("Admin email: ").strip().lower()
        password = input("Admin password: ")

        existing_user = db.query(models.User).filter(
            models.User.email == email
        ).first()

        if existing_user:

            print("A user with this email already exists.")

            if existing_user.role == "admin":
                print("This account is already an admin.")

            else:
                print(
                    "This email belongs to a normal user. "
                    "Use a different email for the admin account."
                )

            return

        admin = models.User(
            full_name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_verified=True
        )

        db.add(admin)

        db.commit()

        db.refresh(admin)

        print()
        print("================================")
        print("Admin account created successfully!")
        print("================================")
        print(f"Admin ID: {admin.id}")
        print(f"Name: {admin.full_name}")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role}")
        print(f"Verified: {admin.is_verified}")

    except Exception as error:

        db.rollback()

        print()
        print("Failed to create admin.")
        print("Error:", error)

    finally:

        db.close()


if __name__ == "__main__":
    create_admin()