import os

import resend
from dotenv import load_dotenv


load_dotenv()


def send_email_service(subject: str, body: str):
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("RESEND_FROM")
    recipient = os.getenv("ALERT_EMAIL_TO")

    if not api_key or not sender or not recipient:
        raise ValueError("Resend email settings are missing")

    resend.api_key = api_key

    try:
        response = resend.Emails.send({
            "from": sender,
            "to": [recipient],
            "subject": subject,
            "text": body,
        })

    except Exception as error:
        raise RuntimeError(
            "Resend request failed"
        ) from error

    if not response or not response.get("id"):
        raise RuntimeError("Resend did not return an email ID")

    return response["id"]


def send_test_email_service():
    return send_email_service(
        subject="HangarManager - Test Email",
        body="This is a test email from HangarManager."
    )


def send_critical_maintenance_email(report: dict):
    subject = "[HangarManager] Critical Maintenance Alert"

    body = (
        "A critical maintenance report has been created.\n\n"
        f"Report ID: {report['id']}\n"
        f"Aircraft ID: {report['aircraft_id']}\n"
        f"Title: {report['title']}\n"
        f"Description: {report['description']}\n"
        f"Priority: {report['priority']}\n"
        f"Status: {report['status']}\n"
    )

    return send_email_service(subject, body)


def send_resolved_maintenance_email(report: dict):
    subject = "[HangarManager] Critical Maintenance Resolved"

    body = (
        "A critical maintenance report has been resolved.\n\n"
        f"Report ID: {report['id']}\n"
        f"Aircraft ID: {report['aircraft_id']}\n"
        f"Title: {report['title']}\n"
        f"Resolution: {report['resolution_notes']}\n"
        f"Status: {report['status']}\n"
    )

    return send_email_service(subject, body)
