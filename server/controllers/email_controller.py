from fastapi import HTTPException

from services.email_service import send_test_email_service


def send_test_email_controller():
    try:
        email_id = send_test_email_service()

        return {
            "message": "Email request accepted by Resend",
            "email_id": email_id,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error)
        ) from error
