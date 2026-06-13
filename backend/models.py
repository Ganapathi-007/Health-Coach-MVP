from pydantic import BaseModel
from typing import List, Optional

class PatientProfile(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[str] = None
    height: Optional[str] = None
    sleep_hours: Optional[float] = None
    goals: List[str] = []
    current_habits: List[str] = []
    health_concerns: List[str] = []
    current_day: int = 1

class CheckIn(BaseModel):
    day: int
    questions_asked: List[str] = []
    user_responses: List[str] = []

class Session(BaseModel):
    session_id: str
    profile: PatientProfile
    check_ins: List[CheckIn] = []
    last_checkin_date: Optional[str] = None

class OnboardRequest(BaseModel):
    raw_text: str
    user_id: Optional[str] = None

class UserSessionRequest(BaseModel):
    user_id: str

class OnboardResponse(BaseModel):
    session_id: str
    profile: PatientProfile
    welcome_message: str

class CheckInRequest(BaseModel):
    session_id: str

class CheckInResponse(BaseModel):
    day: int
    questions: List[str]

class AskRequest(BaseModel):
    session_id: str
    question: str

class AskResponse(BaseModel):
    answer: str

class RespondRequest(BaseModel):
    session_id: str
    questions: List[str]
    responses: List[str]

class RespondResponse(BaseModel):
    coaching: str
    new_day: int
