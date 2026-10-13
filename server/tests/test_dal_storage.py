"""Mock-only query contract tests for aircraft, user, and dashboard DALs."""
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from dal import aircraft_dal, dashboard_dal, user_dal
from tests.fake_supabase import SupabaseSpy


def test_aircraft_get_all_uses_table_select(monkeypatch):
    rows = [{"id": "plane-1"}, {"id": "plane-2"}]
    spy = SupabaseSpy(aircraft=rows)
    monkeypatch.setattr(aircraft_dal, "supabase", spy)
    assert aircraft_dal.get_all_aircraft() == rows
    assert ("aircraft", "select", "*") in spy.calls


@pytest.mark.parametrize("rows, expected", [([{"id": "A"}], {"id": "A"}), ([], None)])
def test_aircraft_get_by_id_handles_missing_record(monkeypatch, rows, expected):
    spy = SupabaseSpy(aircraft=rows)
    monkeypatch.setattr(aircraft_dal, "supabase", spy)
    assert aircraft_dal.get_aircraft_by_id("A") == expected
    assert ("aircraft", "eq", "id", "A") in spy.calls


def test_aircraft_creation(monkeypatch):
    spy = SupabaseSpy(aircraft=[{"id": "A", "tail_number": "202"}])
    monkeypatch.setattr(aircraft_dal, "supabase", spy)
    assert aircraft_dal.create_aircraft({"tail_number": "202"})["id"] == "A"
    assert ("aircraft", "insert", {"tail_number": "202"}) in spy.calls


@pytest.mark.parametrize("action, expected", [
    ("update_aircraft", ("aircraft", "update", {"status": "Available"})),
    ("delete_aircraft", ("aircraft", "delete")),
])
def test_aircraft_update_or_delete(monkeypatch, action, expected):
    spy = SupabaseSpy(aircraft=[{"id": "A"}])
    monkeypatch.setattr(aircraft_dal, "supabase", spy)
    args = ("A", {"status": "Available"}) if action == "update_aircraft" else ("A",)
    assert getattr(aircraft_dal, action)(*args) == {"id": "A"}
    assert expected in spy.calls
    assert ("aircraft", "eq", "id", "A") in spy.calls


@pytest.mark.parametrize("action", ["update_aircraft", "delete_aircraft"])
def test_aircraft_update_or_delete_missing(monkeypatch, action):
    spy = SupabaseSpy(aircraft=[])
    monkeypatch.setattr(aircraft_dal, "supabase", spy)
    args = ("A", {"status": "Available"}) if action == "update_aircraft" else ("A",)
    assert getattr(aircraft_dal, action)(*args) is None


def test_users_list_has_only_public_columns_and_role_filter(monkeypatch):
    spy = SupabaseSpy(users=[{"id": "T", "role": "technician"}])
    monkeypatch.setattr(user_dal, "supabase", spy)
    assert user_dal.get_all_users("technician") == [{"id": "T", "role": "technician"}]
    assert ("users", "select", "id, display_name, email, role, is_active") in spy.calls
    assert ("users", "eq", "role", "technician") in spy.calls
    assert ("users", "order", "display_name") in spy.calls


def test_users_list_unfiltered_does_not_filter_role(monkeypatch):
    spy = SupabaseSpy(users=[])
    monkeypatch.setattr(user_dal, "supabase", spy)
    assert user_dal.get_all_users() == []
    assert spy.operations("users", "eq") == []


@pytest.mark.parametrize("method,column,value", [
    ("get_user_by_email", "email", "test@example.com"),
    ("get_user_by_id", "id", "u123"),
])
@pytest.mark.parametrize("rows", [[{"id": "u123"}], []])
def test_find_user_handles_exists_and_missing(monkeypatch, method, column, value, rows):
    spy = SupabaseSpy(users=rows)
    monkeypatch.setattr(user_dal, "supabase", spy)
    assert getattr(user_dal, method)(value) == (rows[0] if rows else None)
    assert ("users", "eq", column, value) in spy.calls


def test_create_user_persists_password_hash_not_plaintext(monkeypatch):
    spy = SupabaseSpy(users=[{"id": "U"}])
    monkeypatch.setattr(user_dal, "supabase", spy)
    assert user_dal.create_user({"password_hash": "hash", "role": "technician"}) == {"id": "U"}
    assert ("users", "insert", {"password_hash": "hash", "role": "technician"}) in spy.calls


@pytest.mark.parametrize("method,fields", [
    ("update_user_role", {"role": "admin"}),
    ("update_user_active", {"is_active": False}),
])
@pytest.mark.parametrize("rows", [[{"id": "U"}], []])
def test_user_updates_handle_missing_row(monkeypatch, method, fields, rows):
    spy = SupabaseSpy(users=rows)
    monkeypatch.setattr(user_dal, "supabase", spy)
    value = "admin" if method == "update_user_role" else False
    assert getattr(user_dal, method)("U", value) == (rows[0] if rows else None)
    assert ("users", "update", fields) in spy.calls
    assert ("users", "eq", "id", "U") in spy.calls


@pytest.mark.parametrize("rows,expected", [([], 0), ([{"id": "U"}], 1), ([{"id": "U"}, {"id": "V"}], 2)])
def test_count_only_active_admins(monkeypatch, rows, expected):
    spy = SupabaseSpy(users=rows)
    monkeypatch.setattr(user_dal, "supabase", spy)
    assert user_dal.count_active_admins() == expected
    assert ("users", "eq", "role", "admin") in spy.calls
    assert ("users", "eq", "is_active", True) in spy.calls


def test_dashboard_data_queries_all_three_datasets(monkeypatch):
    calls = []

    def fake_rows(table, fields):
        calls.append((table, fields))
        return [{"id": table}]

    monkeypatch.setattr(dashboard_dal, "get_dashboard_rows", fake_rows)
    result = dashboard_dal.get_dashboard_data()
    assert result == {
        "aircraft": [{"id": "aircraft"}],
        "reports": [{"id": "maintenance_reports"}],
        "inspections": [{"id": "inspections"}],
    }
    assert calls == [
        ("aircraft", "id,status"),
        ("maintenance_reports", "id,status,priority"),
        ("inspections", "id,status,due_date"),
    ]


def test_dashboard_one_page_avoids_extra_read(monkeypatch):
    spy = SupabaseSpy(aircraft=[{"id": "A"}])
    monkeypatch.setattr(dashboard_dal, "supabase", spy)
    assert dashboard_dal.get_dashboard_rows("aircraft", "id,status") == [{"id": "A"}]
    assert spy.operations("aircraft", "range") == [("aircraft", "range", 0, 999)]
    assert spy.operations("aircraft", "order") == [("aircraft", "order", "id")]


def test_dashboard_paginates_when_first_page_is_full(monkeypatch):
    class Pages(SupabaseSpy):
        def table(self, name):
            query = super().table(name)

            def set_range(start, end):
                query._record("range", start, end)
                query.rows = [{"id": i} for i in range(start, min(end + 1, 1003))]
                return query

            query.range = set_range
            return query

    spy = Pages()
    monkeypatch.setattr(dashboard_dal, "supabase", spy)
    rows = dashboard_dal.get_dashboard_rows("aircraft", "id,status")
    assert len(rows) == 1003
    assert rows[0]["id"] == 0
    assert rows[-1]["id"] == 1002
    assert spy.operations("aircraft", "range") == [
        ("aircraft", "range", 0, 999), ("aircraft", "range", 1000, 1999),
    ]
