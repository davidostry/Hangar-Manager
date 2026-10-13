from pydantic import BaseModel


class EmailTestResponse(BaseModel):
    message: str
    email_id: str
