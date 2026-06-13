import uuid
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    OnboardRequest, OnboardResponse,
    CheckInRequest, CheckInResponse,
    AskRequest, AskResponse,
    RespondRequest, RespondResponse,
    UserSessionRequest,
    Session, CheckIn
)
from agent import parse_patient_profile, generate_checkin_questions, answer_from_protocol, generate_coaching_response
from pdf_loader import protocol_text
import memory

app = FastAPI(title="Health Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Health Coach API is running"}


@app.post("/onboard", response_model=OnboardResponse)
def onboard(request: OnboardRequest):
    profile = parse_patient_profile(request.raw_text)
    session_id = str(uuid.uuid4())
    session = Session(session_id=session_id, profile=profile, last_checkin_date=str(date.today()))
    memory.save_session(session, user_id=request.user_id)

    name_part = f", {profile.name}" if profile.name else ""
    goals_text = ", ".join(profile.goals) if profile.goals else "your wellness goals"
    welcome = (
        f"Welcome{name_part}. I've set up your profile. You're on Day {profile.current_day} "
        f"of your 30-day program. I'll be checking in with you daily to help you make progress on {goals_text}. "
        f"Let's build something lasting."
    )
    return OnboardResponse(session_id=session_id, profile=profile, welcome_message=welcome)


@app.post("/auth/me", response_model=OnboardResponse)
def get_my_session(request: UserSessionRequest):
    session = memory.get_session_by_user(request.user_id)
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    name_part = f", {session.profile.name}" if session.profile.name else ""
    return OnboardResponse(
        session_id=session.session_id,
        profile=session.profile,
        welcome_message=f"Welcome back{name_part}."
    )


@app.post("/checkin", response_model=CheckInResponse)
def checkin(request: CheckInRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    day = session.profile.current_day
    questions = generate_checkin_questions(day, session.profile, session.check_ins)

    new_checkin = CheckIn(day=day, questions_asked=questions)
    session.check_ins.append(new_checkin)
    memory.update_session(session)

    return CheckInResponse(day=day, questions=questions)


@app.post("/checkin/respond", response_model=RespondResponse)
def checkin_respond(request: RespondRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    day = session.profile.current_day
    coaching = generate_coaching_response(
        day, request.questions, request.responses, session.profile
    )

    today = str(date.today())
    if session.last_checkin_date != today:
        session.profile.current_day += 1
        session.last_checkin_date = today

    if session.check_ins:
        session.check_ins[-1].user_responses = request.responses
    memory.update_session(session)

    return RespondResponse(coaching=coaching, new_day=session.profile.current_day)


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    answer = answer_from_protocol(request.question, protocol_text, session.profile)
    return AskResponse(answer=answer)
