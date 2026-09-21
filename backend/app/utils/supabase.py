from typing import Optional
from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Optional[Client]:
    """Initialize Supabase client if valid credentials are configured in .env."""
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        if not settings.SUPABASE_URL.startswith("https://placeholder"):
            try:
                return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            except Exception as e:
                print(f"[Supabase Client Init Warning] {e}")
                return None
    return None
