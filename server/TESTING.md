# HangarManager — Unit & Mock Tests

This suite was adapted to the **actual server source in `Hangar-Manager-main-test(1).zip`**,
including the `enrich_reports` and `enrich_inspections` functions added to the DAL.
It makes **no live Supabase or Resend calls** and does not require a running API server.

## Run on Windows

Open Git Bash from the repository root, with `server/.venv` already available:

```bash
server/.venv/Scripts/python.exe -m pip install -r server/requirements-dev.txt
server/.venv/Scripts/python.exe -m pytest -q server/tests
```

If your Python environment does not have the application dependencies yet, first install
`server/requirements.txt` in the same venv. (The project snapshot's `requirements.txt`
is UTF-16 encoded, so `pip` may need a UTF-8 converted copy on some systems.)

Or, from the **`server/` directory** after activating the venv:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q tests
```

## Coverage

From the repository root (venv active):

```bash
python -m pytest -q server/tests \
  --cov=services.user_service \
  --cov=services.auth_service \
  --cov=services.maintenance_service \
  --cov=services.inspection_service \
  --cov=services.aircraft_status_service \
  --cov=services.aircraft_service \
  --cov=services.dashboard_service \
  --cov=services.email_service \
  --cov=dependencies.auth \
  --cov=dependencies.permissions \
  --cov=dal.user_dal \
  --cov=dal.aircraft_dal \
  --cov=dal.maintenance_dal \
  --cov=dal.inspection_dal \
  --cov=dal.dashboard_dal \
  --cov-report=term-missing
```

## What is covered?

- **Authentication:** login failure/success, invalid/expired tokens, stale roles, inactive users.
- **User management:** role-based visibility, account creation, changing roles, last-admin protection, deactivation/reactivation.
- **Maintenance:** create/assign/update/resolve/cancel/delete, critical alerts, status sync.
- **Inspections:** scheduled/completed/cancelled logic, due dates, overdue calculations.
- **Aircraft & dashboard:** business rules, status sync, aggregation, paginated DAL reads.
- **DAL + new response enrichment:** batched related lookups, optional user names and aircraft tail numbers, missing relation fallbacks, CRUD return structures.
- **FastAPI mock route tests:** endpoint role restrictions, Users APIs, response serialization, public register removal, email endpoint restrictions.
- **Email:** success, missing config and simulated failures without contacting Resend.

## How mocks isolate external services

`tests/conftest.py` intercepts the Supabase client import and replaces the Resend SDK
with stand-ins. Service dependencies are patched with pytest `monkeypatch` and
`unittest.mock`. `tests/fake_supabase.py` provides an in-memory fluent query spy.
FastAPI `TestClient` tests use dependency overrides and mocked controllers; they do
not open a network port or send real mail.

## Result on the provided source snapshot

- **181 tests passed** in an isolated local environment.
- **98% line coverage across the 15 explicitly selected modules listed above.**
- These are **not** whole-project coverage figures. Frontend, all controllers,
  complete API integration, database constraints, environment configuration and
  real external provider behavior are outside the suite's scope.
- Results on a later Git commit may differ. Re-run the suite locally before committing.

## Git guidance

Create a separate tests feature branch. Add `server/tests/`,
`server/requirements-dev.txt`, and `server/TESTING.md`; commit only those files.
Do not commit `.env`, `.venv`, `node_modules`, `.coverage`, `.pytest_cache`,
`__pycache__`, or real credentials.
