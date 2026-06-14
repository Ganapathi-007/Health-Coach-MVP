import json
import os
from anthropic import Anthropic
from dotenv import load_dotenv
from models import PatientProfile

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

PROGRAM_ROUTES = {
    "anxiety": [
        ("Week 1 (Sleep + Breathing Foundation)",       "sleep quality, breathing habits, and evening wind-down routines"),
        ("Week 2 (Stress Trigger Mapping)",             "identifying specific stress triggers, emotional patterns, and coping responses"),
        ("Week 3 (Mindfulness + Movement)",             "daily movement, mindfulness practice, and nervous system regulation"),
        ("Week 4 (Consistency + Resilience)",           "habit consistency, progress reflection, and building long-term resilience"),
    ],
    "weight_loss": [
        ("Week 1 (Sleep + Metabolism Foundation)",      "sleep quality and how it drives metabolism, hunger hormones, and cravings"),
        ("Week 2 (Nutrition + Meal Timing)",            "meal timing, food choices, portion awareness, and blood sugar stability"),
        ("Week 3 (Movement + Daily Activity)",          "daily steps, structured exercise, and non-exercise activity thermogenesis"),
        ("Week 4 (Habit Stacking + Progress Review)",   "habit consistency, progress wins, and sustainable routine building"),
    ],
    "skin": [
        ("Week 1 (Hydration + Sleep)",                  "daily water intake, sleep quality, and their direct impact on skin health"),
        ("Week 2 (Diet + Gut Health)",                  "food choices, gut health, and foods that trigger or calm inflammation and acne"),
        ("Week 3 (Stress + Hormones)",                  "stress levels, hormonal patterns, and how they drive skin flare-ups"),
        ("Week 4 (Routine + Progress Review)",          "skincare routine consistency, progress tracking, and habit reinforcement"),
    ],
    "energy": [
        ("Week 1 (Sleep Quality Foundation)",           "sleep depth, consistency, and habits that drain or restore energy overnight"),
        ("Week 2 (Nutrition + Blood Sugar)",            "meal timing, blood sugar stability, caffeine use, and energy crashes"),
        ("Week 3 (Sunlight + Movement)",                "morning sunlight exposure, daily movement, and their impact on energy and mood"),
        ("Week 4 (Habit Stacking + Progress Review)",   "energy habit consistency, identifying peak vs. low energy windows, and progress"),
    ],
    "behavioral": [
        ("Week 1 (Trigger Awareness)",                  "identifying the specific triggers, times, emotions, and environments that precede the compulsive behavior"),
        ("Week 2 (Habit Replacement)",                  "building concrete replacement behaviors, urge surfing techniques, and friction strategies"),
        ("Week 3 (Dopamine Regulation + Movement)",     "exercise, cold exposure, structured routine, and activities that rebuild healthy dopamine sensitivity"),
        ("Week 4 (Accountability + Progress Review)",   "streak tracking, honest self-assessment, handling relapses without shame, and building forward momentum"),
    ],
    "general": [
        ("Week 1 (Sleep Foundation + Hydration)",       "sleep quality and daily water intake"),
        ("Week 2 (Nutrition + Meal Timing)",            "meal timing, food choices, and blood sugar stability"),
        ("Week 3 (Movement + Stress Management)",       "daily steps, exercise, and stress levels"),
        ("Week 4 (Habit Stacking + Progress Review)",   "habit consistency, progress, and wins"),
    ],
}


def detect_program_route(profile: PatientProfile) -> str:
    concerns = ", ".join(profile.health_concerns) if profile.health_concerns else ""
    goals = ", ".join(profile.goals) if profile.goals else ""
    response = client.messages.create(
        model=MODEL,
        max_tokens=10,
        system="""You are a health program router. Based on the patient's concerns and goals, pick the single best route.
Return ONLY one of these exact strings: anxiety, weight_loss, skin, energy, behavioral, general
Rules:
- behavioral: compulsive habits, addiction, porn, masturbation, social media overuse, gambling, impulse control
- anxiety: stress, panic, worry, mental health, burnout, overwhelm
- weight_loss: weight, fat loss, obesity, BMI, diet
- skin: acne, eczema, rosacea, skin health, complexion
- energy: fatigue, tiredness, low energy, brain fog, motivation
- general: everything else or mixed concerns
No explanation. Just the one word.""",
        messages=[{"role": "user", "content": f"Concerns: {concerns}\nGoals: {goals}"}]
    )
    route = response.content[0].text.strip().lower()
    return route if route in PROGRAM_ROUTES else "general"


def parse_patient_profile(raw_text: str) -> PatientProfile:
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system="""You are a health data parser. Extract patient info from intake form data.
Return ONLY a valid JSON object with exactly these fields:
{
  "name": string or null,
  "age": integer or null,
  "weight": string or null,
  "height": string or null,
  "sleep_hours": float or null,
  "goals": ["list", "of", "strings"],
  "current_habits": ["list", "of", "strings"],
  "health_concerns": ["list", "of", "strings"]
}
Infer goals and concerns from the "Health concerns and goals" field.
No explanation. No markdown. Just the JSON object.""",
        messages=[{"role": "user", "content": raw_text}]
    )
    data = json.loads(response.content[0].text)
    return PatientProfile(**data)


def generate_checkin_questions(day: int, profile: PatientProfile, previous_checkins: list) -> list[str]:
    route = profile.program_route or "general"
    track = PROGRAM_ROUTES.get(route, PROGRAM_ROUTES["general"])
    if day <= 7:
        week, focus = track[0]
    elif day <= 14:
        week, focus = track[1]
    elif day <= 21:
        week, focus = track[2]
    else:
        week, focus = track[3]

    all_asked = [q for c in previous_checkins for q in c.questions_asked]
    previous_summary = ""
    if all_asked:
        previous_summary = f"Questions already asked (do NOT repeat or paraphrase these):\n" + "\n".join(f"- {q}" for q in all_asked)
    if previous_checkins and previous_checkins[-1].user_responses:
        previous_summary += f"\nLast responses: {previous_checkins[-1].user_responses}"

    pattern_context = ""
    completed = [c for c in previous_checkins if c.user_responses]
    if len(completed) >= 3:
        recent_lines = []
        for c in completed[-7:]:
            pairs = " | ".join([f"Q: {q} — A: {r}" for q, r in zip(c.questions_asked, c.user_responses)])
            recent_lines.append(f"Day {c.day}: {pairs}")
        pattern_context = (
            "\n\nRecent check-in history (last 7 days):\n" + "\n".join(recent_lines) +
            "\n\nPattern instruction: Scan the history above for anything recurring — same struggle 3+ days, "
            "consistent avoidance, repeated timing, a habit that keeps slipping. "
            "If you find one, make at least 1 question directly reference it by name. "
            "Don't be subtle — call it out. If no clear pattern exists, ignore this instruction."
        )

    concerns = ", ".join(profile.health_concerns) if profile.health_concerns else ""
    goals = ", ".join(profile.goals) if profile.goals else ""

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=f"""You are a health coach running a 30-day wellness program.
Patient: age={profile.age}, sleep={profile.sleep_hours}hrs, goals={goals}, health concerns={concerns}.
Today is Day {day} ({week}).
{previous_summary}{pattern_context}
Generate exactly 3 check-in questions focused on {focus}.
Critically: connect the week's focus to this patient's specific goals and concerns.
For example, if they have anxiety — mention how sleep affects anxiety.
If they have acne — mention how hydration affects skin.
If they want to lose weight — tie hydration or sleep to metabolism and cravings.
Questions must feel written for this specific person, not generic.
No emojis, no fluff. Direct and conversational.
Return ONLY a JSON array of 3 strings. No explanation. No markdown.""",
        messages=[{"role": "user", "content": f"Generate Day {day} check-in questions."}]
    )
    return json.loads(response.content[0].text)


def generate_coaching_response(day: int, questions: list, responses: list, profile: PatientProfile) -> str:
    qa_pairs = "\n".join([f"Q: {q}\nA: {r}" for q, r in zip(questions, responses)])
    response = client.messages.create(
        model=MODEL,
        max_tokens=250,
        system=f"""You are a health coach reviewing a patient's daily check-in answers.
Patient: age={profile.age}, sleep={profile.sleep_hours}hrs, goals={profile.goals}, Day {day} of 30.
Rules:
- No emojis. No filler like "great job" or "well done".
- Acknowledge what they shared in 1 sentence.
- Give 1-2 specific, actionable next steps based on their answers.
- Max 80 words. Warm but direct.""",
        messages=[{"role": "user", "content": f"Check-in responses:\n{qa_pairs}"}]
    )
    return response.content[0].text


def generate_progress_summary(profile: PatientProfile, check_ins: list) -> str:
    def format_checkins(checkins):
        parts = []
        for c in checkins:
            pairs = "\n".join([f"  Q: {q}\n  A: {r}" for q, r in zip(c.questions_asked, c.user_responses)])
            parts.append(f"Day {c.day}:\n{pairs}")
        return "\n\n".join(parts)

    this_week = check_ins[-7:]
    last_week = check_ins[-14:-7] if len(check_ins) >= 8 else []

    last_week_text = format_checkins(last_week) if last_week else "No previous week data yet."

    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=f"""You are a health coach reviewing a patient's progress.
Patient: {profile.name or 'Patient'}, age={profile.age}, goals={profile.goals}, concerns={profile.health_concerns}.
Rules:
- No emojis. No filler like "great job".
- Be specific — reference actual things the patient said in their responses.
- Identify 2-3 clear trends (improving, worsening, or consistent) across the check-ins.
- If last week data exists, compare directly. If not, summarize patterns from this week only.
- End with 1 concrete focus area for the coming days.
- Max 150 words. Warm but direct.""",
        messages=[{"role": "user", "content": f"THIS WEEK:\n{format_checkins(this_week)}\n\nLAST WEEK:\n{last_week_text}"}]
    )
    return response.content[0].text


def answer_from_protocol(question: str, protocol_context: str, profile: PatientProfile) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=f"""You are a health coach. Answer using ONLY the wellness protocol below.
Rules:
- No emojis. No "great question". No filler phrases.
- Be direct and warm. 2-4 sentences max unless a list is genuinely needed.
- If the answer is not in the protocol, say exactly: "That's outside your current protocol — check with your doctor."
- Do not invent facts or add advice not in the protocol.

Patient: age={profile.age}, goals={profile.goals}.

WELLNESS PROTOCOL:
{protocol_context}""",
        messages=[{"role": "user", "content": question}]
    )
    return response.content[0].text
