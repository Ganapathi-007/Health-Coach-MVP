from typing import Dict, Optional
from models import Session

_sessions: Dict[str, Session] = {}

def save_session(session: Session) -> None:
    _sessions[session.session_id] = session

def get_session(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)

def update_session(session: Session) -> None:
    _sessions[session.session_id] = session
