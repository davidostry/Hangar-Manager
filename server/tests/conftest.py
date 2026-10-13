"""Import guards: Unit tests never initialize Supabase or contact Resend.

Run from server/: python -m pytest -q
"""
import os
import sys
from pathlib import Path
from types import ModuleType
from unittest.mock import MagicMock
import importlib.util

SERVER = Path(__file__).resolve().parents[1]
if str(SERVER) not in sys.path:
    sys.path.insert(0, str(SERVER))

os.environ.setdefault("JWT_SECRET", "hangar-unit-tests-only-not-production")

# Services import DAL modules, which would otherwise initialize a real client
# at import time. Stubbing this module avoids all Supabase network activity.
fake_db = ModuleType("db.supabase_client")
fake_db.supabase = MagicMock(name="blocked_supabase_client")
sys.modules["db.supabase_client"] = fake_db

# Never allow outbound Resend requests, even when the real SDK is installed.
fake_resend = ModuleType("resend")
fake_resend.Emails = MagicMock(name="fake_resend_emails")
fake_resend.api_key = None
sys.modules["resend"] = fake_resend

# In a full project venv bcrypt is installed. This fallback only enables
# service-level tests in a minimal offline environment.
if importlib.util.find_spec("bcrypt") is None:
    fake_bcrypt = ModuleType("bcrypt")
    fake_bcrypt.gensalt = MagicMock(return_value=b"salt")
    fake_bcrypt.hashpw = MagicMock(return_value=b"fake-hash")
    fake_bcrypt.checkpw = MagicMock(return_value=True)
    sys.modules["bcrypt"] = fake_bcrypt
