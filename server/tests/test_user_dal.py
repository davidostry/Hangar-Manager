"""User DAL query composition using a Supabase query-builder mock."""
from types import SimpleNamespace
from unittest.mock import MagicMock

from dal import user_dal as dal


def fake_query(monkeypatch, data):
    client = MagicMock()
    query = client.table.return_value.select.return_value
    query.eq.return_value = query
    query.order.return_value = query
    query.execute.return_value = SimpleNamespace(data=data)
    monkeypatch.setattr(dal, "supabase", client)
    return client, query


def test_team_lead_query_filters_to_technicians(monkeypatch):
    client, query = fake_query(monkeypatch, [{"role": "technician"}])
    assert dal.get_all_users("technician") == [{"role": "technician"}]
    client.table.assert_called_once_with("users")
    query.eq.assert_called_once_with("role", "technician")


def test_admin_query_does_not_filter_roles(monkeypatch):
    _client, query = fake_query(monkeypatch, [{"role": "admin"}])
    assert dal.get_all_users() == [{"role": "admin"}]
    query.eq.assert_not_called()


def test_active_admins_query_count(monkeypatch):
    client, query = fake_query(monkeypatch, [{"id": "one"}, {"id": "two"}])
    assert dal.count_active_admins() == 2
    assert query.eq.call_args_list[0].args == ("role", "admin")
    assert query.eq.call_args_list[1].args == ("is_active", True)
    client.table.assert_called_once_with("users")


def test_user_lookup_returns_none_for_missing_row(monkeypatch):
    _client, query = fake_query(monkeypatch, [])
    assert dal.get_user_by_id("missing") is None
    query.eq.assert_called_once_with("id", "missing")
