from pydantic import BaseModel


class DocumentQuestion(BaseModel):
    question: str