import json
import os
from anthropic import Anthropic
from dotenv import load_dotenv
from models import PatientProfile

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

def parse_patient_profile(raw_text: str) -> PatientProfile:
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system="""You are a health data parser. Extract patient info from unstructured text.
Return ONLY a valid JSON object with exactly these fields:
{
  "age": integer or null,
  "sleep_hours": float or null,
  "goals": ["list", "of", "strings"],
  "current_habits": ["list", "of", "strings"],
  "health_concerns": ["list", "of", "strings"]
}
No explanation. No markdown. Just the JSON object.""",
        messages=[{"role": "user", "content": raw_text}]
    )
    data = json.loads(response.content[0].text)
    return PatientProfile(**data)


def generate_checkin_questions(day: int, profile: PatientProfile, previous_checkins: list) -> list[str]:
    if day <= 7:
        week = "Week 1 (Sleep Foundation + Hydration)"
        focus = "sleep quality and daily water intake"
    elif day <= 14:
        week = "Week 2 (Nutrition + Meal Timing)"
        focus = "meal timing, food choices, and blood sugar stability"
    elif day <= 21:
        week = "Week 3 (Movement + Stress Management)"
        focus = "daily steps, exercise, and stress levels"
    else:
        week = "Week 4 (Habit Stacking + Progress Review)"
        focus = "habit consistency, progress, and wins"

    all_asked = [q for c in previous_checkins for q in c.questions_asked]
    previous_summary = ""
    if all_asked:
        previous_summary = f"Questions already asked (do NOT repeat or paraphrase these):\n" + "\n".join(f"- {q}" for q in all_asked)
    if previous_checkins and previous_checkins[-1].user_responses:
        previous_summary += f"\nLast responses: {previous_checkins[-1].user_responses}"

    concerns = ", ".join(profile.health_concerns) if profile.health_concerns else ""
    goals = ", ".join(profile.goals) if profile.goals else ""

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=f"""You are a health coach running a 30-day wellness program.
Patient: age={profile.age}, sleep={profile.sleep_hours}hrs, goals={goals}, health concerns={concerns}.
Today is Day {day} ({week}).
{previous_summary}
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
