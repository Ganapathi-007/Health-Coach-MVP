import os
from supabase import create_client, Client
from dotenv import load_dotenv
from models import Session

load_dotenv()

_supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SECRET_KEY")
)

def save_session(session: Session, user_id: str = None) -> None:
    _supabase.table("sessions").insert({
        "session_id": session.session_id,
        "user_id": user_id,
        "data": session.model_dump()
    }).execute()

def get_session(session_id: str):
    result = _supabase.table("sessions").select("data").eq("session_id", session_id).execute()
    if not result.data:
        return None
    return Session(**result.data[0]["data"])

def get_session_by_user(user_id: str):
    result = (
        _supabase.table("sessions")
        .select("data")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return Session(**result.data[0]["data"])

def update_session(session: Session) -> None:
    _supabase.table("sessions").update({
        "data": session.model_dump()
    }).eq("session_id", session.session_id).execute()
