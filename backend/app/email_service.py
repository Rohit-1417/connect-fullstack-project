from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage
import os 

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")




def send_otp_email(to_email: str, otp: str):

    msg = EmailMessage()

    msg["Subject"] = "Your OTP for Account Verification"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email

    msg.set_content(
        f"""
Hello,

Your OTP for account verification is:

{otp}

This OTP is valid for 5 minutes.

If you did not request this, please ignore this email.

Thank you.
"""
    )

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)



def send_password_changed_email(to_email: str):
    msg = EmailMessage()

    msg["Subject"] = "Password Changed Successfully"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email

    msg.set_content(
        """
Hello,

Your password has been changed successfully.

If you did not make this change, please contact us immediately.

Thank you.
"""
    )

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)

