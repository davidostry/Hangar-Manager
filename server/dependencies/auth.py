import os

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("Missing JWT_SECRET environment variable")


security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )

        return payload

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )