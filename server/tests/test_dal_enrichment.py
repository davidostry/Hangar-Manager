"""The new response-enrichment code in THIS ZIP, with fake Supabase lookups."""
from datetime import datetime, timezone, date
from uuid import UUID

import pytest

from dal import inspection_dal as inspections
from dal import maintenance_dal as maintenance
from schemas.inspection_schema import InspectionResponse
from schemas.maintenance_schema import MaintenanceResponse
from tests.fake_supabase import SupabaseSpy

AIRCRAFT = "f262823f-5247-4239-a3fd-f12ce306b1c5"
AIRCRAFT_2 = "b6f456d6-91d0-45c5-a56e-252791c063fe"
REPORTER = "5f8a65f8-96a9-4b98-9c18-f39bcacd6ce0"
ASSIGNEE = "b1c939a1-ff08-4738-bd66-4b6c9002124a"
REPORT = "36eaa3fe-6a75-4b65-89e6-d4057bb0dc1a"
INSPECTION = "097bc962-7798-485f-b44f-d38f4aa9cdee"


def report(**updates):
    return {
        "id": REPORT, "aircraft_id": AIRCRAFT, "reported_by": REPORTER,
        "assigned_to": ASSIGNEE, "title": "Engine", "description": "Repair",
        "priority": "High", "status": "InProgress",
        "reported_at": "2026-10-12T08:00:00+00:00", **updates,
    }


def inspection(**updates):
    return {
        "id": INSPECTION, "aircraft_id": AIRCRAFT,
        "inspection_type": "100-hour", "due_date": "2026-10-15",
        "status": "Scheduled", "created_at": "2026-10-12T08:00:00Z",
        "updated_at": "2026-10-12T08:00:00Z", "is_overdue": False,
        **updates,
    }


def setup_maintenance(monkeypatch, rows=None, users=None, aircraft=None):
    spy = SupabaseSpy(
        maintenance_reports=[] if rows is None else rows,
        users=[{"id": REPORTER, "display_name": "Admin One"},
               {"id": ASSIGNEE, "display_name": "Tech One"}] if users is None else users,
        aircraft=[{"id": AIRCRAFT, "tail_number": "202"}] if aircraft is None else aircraft,
    )
    monkeypatch.setattr(maintenance, "supabase", spy)
    return spy


def setup_inspections(monkeypatch, rows=None, aircraft=None):
    spy = SupabaseSpy(
        inspections=[] if rows is None else rows,
        aircraft=[{"id": AIRCRAFT, "tail_number": "202"}] if aircraft is None else aircraft,
    )
    monkeypatch.setattr(inspections, "supabase", spy)
    return spy


def test_enrich_reports_uses_two_batched_queries_and_preserves_ids(monkeypatch):
    first = report()
    second = report(id="another", assigned_to=REPORTER)
    spy = setup_maintenance(monkeypatch)
    result = maintenance.enrich_reports([first, second])
    assert len(result) == 2
    assert result[0]["reported_by_name"] == "Admin One"
    assert result[0]["assigned_to_name"] == "Tech One"
    assert result[0]["aircraft_tail_number"] == "202"
    assert result[0]["aircraft_id"] == AIRCRAFT
    assert result[0]["reported_by"] == REPORTER
    assert result[0]["assigned_to"] == ASSIGNEE
    assert "aircraft_tail_number" not in first  # no mutation
    assert spy.operations("users", "in_") == [
        ("users", "in_", "id", sorted([ASSIGNEE, REPORTER]))
    ]
    assert spy.operations("aircraft", "in_") == [("aircraft", "in_", "id", [AIRCRAFT])]
    assert len(spy.operations("users", "execute")) == 1
    assert len(spy.operations("aircraft", "execute")) == 1


def test_enrich_reports_no_assignee_or_missing_lookup_returns_nulls(monkeypatch):
    spy = setup_maintenance(monkeypatch, users=[], aircraft=[])
    result = maintenance.enrich_reports([report(assigned_to=None)])
    assert result[0]["reported_by_name"] is None
    assert result[0]["assigned_to_name"] is None
    assert result[0]["aircraft_tail_number"] is None
    assert spy.operations("users", "in_") == [("users", "in_", "id", [REPORTER])]


def test_enrich_reports_missing_foreign_ids_avoids_queries(monkeypatch):
    spy = setup_maintenance(monkeypatch)
    result = maintenance.enrich_reports([{"id": "r", "reported_by": None}])
    assert result == [{"id": "r", "reported_by": None,
                       "reported_by_name": None, "assigned_to_name": None,
                       "aircraft_tail_number": None}]
    assert spy.calls == []


def test_enrich_reports_empty_avoids_queries(monkeypatch):
    spy = setup_maintenance(monkeypatch)
    assert maintenance.enrich_reports([]) == []
    assert spy.calls == []


@pytest.mark.parametrize("method, expected_operator", [
    ("get_all_reports", "select"),
    ("get_report_by_id", "eq"),
    ("create_report", "insert"),
    ("update_report", "update"),
    ("delete_report", "delete"),
])
def test_maintenance_dal_methods_return_enriched_responses(monkeypatch, method, expected_operator):
    spy = setup_maintenance(monkeypatch, rows=[report()])
    args = {
        "get_all_reports": (AIRCRAFT,),
        "get_report_by_id": (REPORT,),
        "create_report": ({"title": "Engine"},),
        "update_report": (REPORT, {"title": "New"}),
        "delete_report": (REPORT,),
    }
    value = getattr(maintenance, method)(*args[method])
    result = value[0] if isinstance(value, list) else value
    assert result["aircraft_tail_number"] == "202"
    assert result["reported_by_name"] == "Admin One"
    assert result["assigned_to_name"] == "Tech One"
    assert spy.operations("maintenance_reports", expected_operator)
    if method == "get_all_reports":
        assert ("maintenance_reports", "eq", "aircraft_id", AIRCRAFT) in spy.calls


@pytest.mark.parametrize("method, args", [
    ("get_all_reports", ()),
    ("get_report_by_id", (REPORT,)),
    ("update_report", (REPORT, {"title": "Changed"})),
    ("delete_report", (REPORT,)),
])
def test_maintenance_dal_empty_results_do_not_fetch_related_data(monkeypatch, method, args):
    spy = setup_maintenance(monkeypatch, rows=[])
    result = getattr(maintenance, method)(*args)
    assert result == ([] if method == "get_all_reports" else None)
    assert not spy.operations("users", "table")
    assert not spy.operations("aircraft", "table")


def test_active_reports_query_is_not_enriched(monkeypatch):
    spy = setup_maintenance(monkeypatch, rows=[report()])
    assert maintenance.get_active_reports_by_aircraft(AIRCRAFT) == [report()]
    assert ("maintenance_reports", "in_", "status", ["Open", "InProgress"]) in spy.calls
    assert not spy.operations("users", "table")


def test_inspection_enrichment_preserves_uuid_and_one_aircraft_lookup(monkeypatch):
    rows = [inspection(), inspection(id="another")]
    spy = setup_inspections(monkeypatch)
    enriched = inspections.enrich_inspections(rows)
    assert [i["aircraft_tail_number"] for i in enriched] == ["202", "202"]
    assert enriched[0]["aircraft_id"] == AIRCRAFT
    assert "aircraft_tail_number" not in rows[0]
    assert spy.operations("aircraft", "in_") == [("aircraft", "in_", "id", [AIRCRAFT])]


def test_inspection_enrichment_unknown_aircraft_returns_null(monkeypatch):
    setup_inspections(monkeypatch, aircraft=[])
    assert inspections.enrich_inspections([inspection()])[0]["aircraft_tail_number"] is None


def test_inspection_enrichment_no_aircraft_id_skips_query(monkeypatch):
    spy = setup_inspections(monkeypatch)
    assert inspections.enrich_inspections([{"id": "i"}]) == [{"id": "i", "aircraft_tail_number": None}]
    assert spy.calls == []


def test_inspection_enrichment_empty_skips_query(monkeypatch):
    spy = setup_inspections(monkeypatch)
    assert inspections.enrich_inspections([]) == []
    assert spy.calls == []


@pytest.mark.parametrize("method, expected_operator", [
    ("get_all_inspections", "select"),
    ("get_inspection_by_id", "eq"),
    ("create_inspection", "insert"),
    ("update_inspection", "update"),
    ("delete_inspection", "delete"),
])
def test_inspections_dal_methods_return_aircraft_tail_number(monkeypatch, method, expected_operator):
    spy = setup_inspections(monkeypatch, rows=[inspection()])
    args = {
        "get_all_inspections": (AIRCRAFT,),
        "get_inspection_by_id": (INSPECTION,),
        "create_inspection": ({"inspection_type": "100-hour"},),
        "update_inspection": (INSPECTION, {"status": "Completed"}),
        "delete_inspection": (INSPECTION,),
    }
    value = getattr(inspections, method)(*args[method])
    result = value[0] if isinstance(value, list) else value
    assert result["aircraft_tail_number"] == "202"
    assert result["aircraft_id"] == AIRCRAFT
    assert spy.operations("inspections", expected_operator)
    if method == "get_all_inspections":
        assert ("inspections", "eq", "aircraft_id", AIRCRAFT) in spy.calls


@pytest.mark.parametrize("method, args", [
    ("get_all_inspections", ()),
    ("get_inspection_by_id", (INSPECTION,)),
    ("update_inspection", (INSPECTION, {"due_date": "2026-10-20"})),
    ("delete_inspection", (INSPECTION,)),
])
def test_inspections_dal_empty_responses_skip_enrichment(monkeypatch, method, args):
    spy = setup_inspections(monkeypatch, rows=[])
    result = getattr(inspections, method)(*args)
    assert result == ([] if method == "get_all_inspections" else None)
    assert not spy.operations("aircraft", "table")


def test_scheduled_inspections_query_is_unenriched(monkeypatch):
    spy = setup_inspections(monkeypatch, rows=[inspection()])
    assert inspections.get_scheduled_inspections_by_aircraft(AIRCRAFT) == [inspection()]
    assert ("inspections", "eq", "status", "Scheduled") in spy.calls
    assert not spy.operations("aircraft", "table")


def test_maintenance_schema_includes_optional_display_fields():
    item = MaintenanceResponse.model_validate(report())
    assert item.reported_by_name is None
    assert item.assigned_to_name is None
    assert item.aircraft_tail_number is None
    value = MaintenanceResponse.model_validate({
        **report(), "reported_by_name": "Admin One", "assigned_to_name": "Tech One",
        "aircraft_tail_number": "202",
    })
    assert value.reported_by_name == "Admin One"
    assert value.assigned_to_name == "Tech One"
    assert value.aircraft_tail_number == "202"
    assert value.aircraft_id == UUID(AIRCRAFT)


def test_inspection_schema_includes_optional_aircraft_tail_number():
    bare = InspectionResponse.model_validate(inspection())
    assert bare.aircraft_tail_number is None
    enriched = InspectionResponse.model_validate({**inspection(), "aircraft_tail_number": "202"})
    assert enriched.aircraft_tail_number == "202"
    assert enriched.aircraft_id == UUID(AIRCRAFT)
