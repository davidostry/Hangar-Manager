import os

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

url = os.getenv("SUPABASE_URL")
secret_key = os.getenv("SUPABASE_SECRET_KEY")

if not url or not secret_key:
    raise RuntimeError("Missing Supabase environment variables")

supabase: Client = create_client(url, secret_key)