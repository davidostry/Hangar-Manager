"""Dashboard aggregates and Resend email logic, with no outgoing mail."""
from datetime import date, timedelta
from unittest.mock import Mock

import pytest

from services import dashboard_service as dashboard
from services import email_service as email


def test_dashboard_counts_active_critical_and_overdue(monkeypatch):
    today = date.today()
    monkeypatch.setattr(dashboard, "get_dashboard_data", Mock(return_value={
        "aircraft": [{"status": "Available"}, {"status": "Grounded"}],
        "reports": [
            {"status": "Open", "priority": "Critical"},
            {"status": "InProgress", "priority": "Low"},
            {"status": "Resolved", "priority": "Critical"},
        ],
        "inspections": [
            {"status": "Scheduled", "due_date": (today - timedelta(days=1)).isoformat()},
            {"status": "Scheduled", "due_date": today.isoformat()},
            {"status": "Scheduled", "due_date": (today + timedelta(days=31)).isoformat()},
            {"status": "Completed", "due_date": (today - timedelta(days=5)).isoformat()},
            {"status": "Cancelled", "due_date": today.isoformat()},
        ],
    }))
    result = dashboard.get_dashboard_summary_service()
    assert result["aircraft"]["total"] == 2
    assert result["aircraft"]["by_status"]["Grounded"] == 1
    assert result["maintenance"]["active"] == 2
    assert result["maintenance"]["critical_active"] == 1
    assert result["inspections"]["overdue"] == 1
    assert result["inspections"]["upcoming_30_days"] == 1
    assert result["inspections"]["completed"] == 1


def test_dashboard_empty_lists(monkeypatch):
    monkeypatch.setattr(dashboard, "get_dashboard_data", Mock(return_value={
        "aircraft": [], "reports": [], "inspections": [],
    }))
    result = dashboard.get_dashboard_summary_service()
    assert result["aircraft"]["total"] == 0
    assert result["maintenance"]["critical_active"] == 0
    assert result["inspections"]["upcoming_30_days"] == 0


def set_email_env(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "fake-key-only-for-test")
    monkeypatch.setenv("RESEND_FROM", "alerts@example.com")
    monkeypatch.setenv("ALERT_EMAIL_TO", "admin@example.com")


def test_email_is_sent_via_mock_only(monkeypatch):
    set_email_env(monkeypatch)
    send = Mock(return_value={"id": "email-1"})
    monkeypatch.setattr(email.resend.Emails, "send", send)
    assert email.send_email_service("Subject", "Body") == "email-1"
    assert send.call_args.args[0]["to"] == ["admin@example.com"]
    assert send.call_args.args[0]["subject"] == "Subject"


def test_missing_email_config_prevents_send(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM", raising=False)
    monkeypatch.delenv("ALERT_EMAIL_TO", raising=False)
    send = Mock()
    monkeypatch.setattr(email.resend.Emails, "send", send)
    with pytest.raises(ValueError, match="settings are missing"):
        email.send_email_service("Subject", "Body")
    send.assert_not_called()


@pytest.mark.parametrize("response", [None, {}, {"unexpected": "value"}])
def test_missing_resend_email_id_is_error(monkeypatch, response):
    set_email_env(monkeypatch)
    monkeypatch.setattr(email.resend.Emails, "send", Mock(return_value=response))
    with pytest.raises(RuntimeError, match="did not return an email ID"):
        email.send_email_service("Subject", "Body")


def test_resend_exception_becomes_runtime_error(monkeypatch):
    set_email_env(monkeypatch)
    monkeypatch.setattr(email.resend.Emails, "send", Mock(
        side_effect=Exception("network unavailable"),
    ))
    with pytest.raises(RuntimeError, match="Resend request failed"):
        email.send_email_service("Subject", "Body")


def test_critical_email_contains_report_information(monkeypatch):
    mail = Mock(return_value="email-1")
    monkeypatch.setattr(email, "send_email_service", mail)
    email.send_critical_maintenance_email({
        "id": "report-1", "aircraft_id": "aircraft-1",
        "title": "Engine", "description": "Broken",
        "priority": "Critical", "status": "Open",
    })
    assert "report-1" in mail.call_args.args[1]
    assert "aircraft-1" in mail.call_args.args[1]
    assert "Critical" in mail.call_args.args[1]


def test_resolved_email_contains_resolution(monkeypatch):
    mail = Mock(return_value="email-2")
    monkeypatch.setattr(email, "send_email_service", mail)
    email.send_resolved_maintenance_email({
        "id": "report-1", "aircraft_id": "aircraft-1",
        "title": "Engine", "resolution_notes": "New part fitted",
        "status": "Resolved",
    })
    assert "New part fitted" in mail.call_args.args[1]
