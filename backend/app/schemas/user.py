from pydantic import BaseModel,EmailStr


class UserRegister(BaseModel):
    full_name : str
    email : EmailStr
    password : str



class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_verified: bool

    class Config:
        from_attributes = True



class OTPVerify(BaseModel):
    email: EmailStr
    otp: str



class UserLogin(BaseModel):
    email: EmailStr
    password: str




class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordVerify(BaseModel):
    email: EmailStr
    otp: str




class ResetPassword(BaseModel):
    new_password: str





class UserListResponse(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True