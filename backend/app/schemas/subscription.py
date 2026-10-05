from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    plan_name: str