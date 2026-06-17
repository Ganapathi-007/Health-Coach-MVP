import uuid
from datetime import date, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    OnboardRequest, OnboardResponse,
    CheckInRequest, CheckInResponse,
    CheckInStartResponse, TurnRequest, TurnResponse,
    AskRequest, AskResponse,
    RespondRequest, RespondResponse,
    ProgressRequest, ProgressResponse,
    UserSessionRequest,
    Session, CheckIn
)
from agent import (
    parse_patient_profile, detect_program_route,
    generate_checkin_questions, answer_from_protocol,
    generate_coaching_response, extract_commitment,
    generate_progress_summary, TRACK_PROTOCOLS,
    generate_coach_opening, generate_coach_turn, update_client_summary,
)
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
    profile.program_route = detect_program_route(profile)
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

    today = str(date.today())
    missed_days = 0

    if session.last_checkin_date and session.last_checkin_date != today:
        last_date = date.fromisoformat(session.last_checkin_date)
        gap = (date.today() - last_date).days
        missed_days = max(0, gap - 1)
        session.profile.current_day += 1
        session.last_checkin_date = today

    day = session.profile.current_day

    questions = generate_checkin_questions(day, session.profile, session.check_ins)
    new_checkin = CheckIn(day=day, questions_asked=questions)
    session.check_ins.append(new_checkin)
    memory.update_session(session)

    return CheckInResponse(day=day, questions=questions, missed_days=missed_days)


@app.post("/checkin/start", response_model=CheckInStartResponse)
def checkin_start(request: CheckInRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    today = str(date.today())
    missed_days = 0

    if session.last_checkin_date and session.last_checkin_date != today:
        last_date = date.fromisoformat(session.last_checkin_date)
        gap = (date.today() - last_date).days
        missed_days = max(0, gap - 1)
        session.profile.current_day += 1
        session.last_checkin_date = today

    day = session.profile.current_day
    opening = generate_coach_opening(day, session.profile, session.check_ins, session.client_summary)

    new_checkin = CheckIn(day=day, questions_asked=[opening])
    session.check_ins.append(new_checkin)
    memory.update_session(session)

    return CheckInStartResponse(day=day, opening=opening, missed_days=missed_days)


@app.post("/checkin/turn", response_model=TurnResponse)
def checkin_turn(request: TurnRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    day = session.profile.current_day
    history = [{"role": t.role, "text": t.text} for t in request.history]
    result = generate_coach_turn(day, session.profile, history, session.check_ins, session.client_summary)

    if result["is_final"] and session.check_ins:
        coach_msgs = [t.text for t in request.history if t.role == "coach"] + [result["message"]]
        user_msgs = [t.text for t in request.history if t.role == "user"]
        session.check_ins[-1].questions_asked = coach_msgs
        session.check_ins[-1].user_responses = user_msgs
        session.check_ins[-1].commitment = result["commitment"]
        session.client_summary = update_client_summary(
            session.profile, session.client_summary or "", session.check_ins
        )
        memory.update_session(session)

    return TurnResponse(
        reply=result["message"],
        is_final=result["is_final"],
        commitment=result["commitment"],
        new_day=day,
    )


@app.post("/checkin/respond", response_model=RespondResponse)
def checkin_respond(request: RespondRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    day = session.profile.current_day
    coaching = generate_coaching_response(
        day, request.questions, request.responses, session.profile
    )

    commitment = extract_commitment(coaching)
    if session.check_ins:
        session.check_ins[-1].user_responses = request.responses
        session.check_ins[-1].commitment = commitment
    memory.update_session(session)

    return RespondResponse(coaching=coaching, new_day=session.profile.current_day, commitment=commitment)


@app.post("/progress", response_model=ProgressResponse)
def get_progress(request: ProgressRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    all_completed = [c for c in session.check_ins if c.user_responses]
    seen_days = set()
    completed = []
    for c in all_completed:
        if c.day not in seen_days:
            seen_days.add(c.day)
            completed.append(c)
    count = len(completed)

    if count < 3:
        return ProgressResponse(summary="", check_in_count=count, has_comparison=False)

    summary = generate_progress_summary(session.profile, completed)
    return ProgressResponse(
        summary=summary,
        check_in_count=count,
        has_comparison=count >= 8
    )


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    session = memory.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    track_protocol = TRACK_PROTOCOLS.get(session.profile.program_route or "general", TRACK_PROTOCOLS["general"])
    answer = answer_from_protocol(request.question, track_protocol, session.profile)
    return AskResponse(answer=answer)
