import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv


load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("Missing JWT_SECRET environment variable")


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=1)
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm="HS256"
    )