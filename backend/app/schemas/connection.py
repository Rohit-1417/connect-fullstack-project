from pydantic import BaseModel


class ConnectionRequest(BaseModel):
    receiver_id: int


class ConnectionResponse(BaseModel):
    connection_id: int
    sender_id: int
    sender_name: str
    status: str