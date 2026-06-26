from supabase import create_client, Client
from dotenv import load_dotenv
import os
from typing import Optional

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Optional[Client] = None

if url and key:
    supabase = create_client(url, key)

