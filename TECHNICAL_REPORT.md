# Technical Report: Health Coach AI Agent — MVP v1

## Overview

A full-stack AI health coaching agent that parses unstructured patient profiles, runs adaptive daily check-ins, and answers wellness questions grounded strictly in a reference protocol document. Built and deployed as a live web application in under 24 hours.

**Live URL:** https://health-coach-mvp-six.vercel.app  
**GitHub:** https://github.com/Ganapathi-007/Health-Coach-MVP

---

## Tech Stack

### Backend: FastAPI (Python)
**Why:** Python is the first-class language for AI development. The Anthropic SDK, PDF parsing libraries, and the broader AI tooling ecosystem are Python-native. FastAPI was chosen over Flask for its automatic request validation via Pydantic models, auto-generated API docs at `/docs`, and async support — all with minimal boilerplate.

### LLM: Claude Sonnet 4.6 (Anthropic API)
**Why:** Claude was chosen for three reasons specific to this task:
1. Strong instruction-following — critical for the "answer only from the protocol" constraint
2. Low hallucination rate on grounded Q&A compared to alternatives
3. Consistent tone control — the warm-but-direct coaching voice is reliably maintained across prompts

No LangChain or agent frameworks were used. Direct API calls give tighter control over prompts, reduce hallucination risk from framework abstraction layers, and make the codebase easier to audit and debug.

### PDF/Document Grounding: pdfplumber + manual chunking
**Why:** The reference wellness protocol is loaded once at server startup, chunked into manageable segments, and injected directly into Claude's context window for each Q&A request. This approach — often called "naive RAG" — is appropriate for a single document of this size. A vector database (Pinecone, ChromaDB) would add unnecessary infrastructure complexity for one document. The grounding constraint is enforced through the system prompt: Claude is explicitly instructed to answer only from the provided protocol text and to deflect out-of-scope questions with a fixed phrase.

### Session Memory: In-process Python dictionary
**Why:** MVP-appropriate. Sessions are stored as Pydantic objects in a server-side dictionary keyed by UUID. This means memory is lost on server restart — acceptable for a demo, not for production. A production version would use Redis or a lightweight database (SQLite, PostgreSQL). The tradeoff was deliberate: zero infrastructure overhead for the MVP.

### Frontend: Next.js (React)
**Why:** Next.js supports URL query parameters natively, which was a hard requirement ("open this link, input a specific query parameter"). React's component model made the three-state check-in flow (idle → answering → complete) straightforward to implement. Deployed on Vercel, which has native Next.js support and zero-configuration deployment from GitHub.

### Deployment
- **Backend:** Render.com (free tier) — chosen for straightforward Python/FastAPI support and GitHub integration
- **Frontend:** Vercel (free tier) — native Next.js deployment, auto-deploys on every git push

---

## Agent Architecture

The agent is composed of three distinct Claude calls, each with a separate system prompt and responsibility:

```
1. parse_patient_profile()
   Input:  raw unstructured text
   Output: structured JSON (age, sleep, goals, habits, concerns)
   Role:   data extraction, runs once at onboarding

2. generate_checkin_questions()
   Input:  patient profile + day number + all previously asked questions
   Output: 3 personalized check-in questions
   Role:   adaptive questioning — week-aware (4 phases over 30 days),
           personalized to the patient's specific concerns,
           non-repetitive across sessions

3. answer_from_protocol()
   Input:  user question + full protocol text + patient profile
   Output: grounded answer or fixed deflection phrase
   Role:   bounded Q&A — answers strictly from the protocol document,
           falls back to "That's outside your current protocol — check
           with your doctor" for out-of-scope questions

4. generate_coaching_response()
   Input:  check-in Q&A pairs + patient profile
   Output: 2-3 sentence personalized coaching response
   Role:   closes the check-in loop with actionable next steps
```

Each function is isolated in `agent.py` with its own system prompt. This separation makes the agent easy to test, modify, and extend independently.

---

## Key Design Decisions

**Why not LangChain?**  
LangChain adds abstraction layers that make hallucination harder to control and prompt behavior harder to predict. For a task with a strict "answer only from the document" constraint, direct API calls with explicit system prompts are more reliable and auditable.

**Why in-memory sessions instead of a database?**  
The assignment specifies memory "within a session." A UUID-keyed Python dictionary satisfies this requirement with zero infrastructure. Adding a database would have been over-engineering for an MVP.

**Why a custom wellness protocol document instead of a real one?**  
No real protocol document was available at build time. A 30-day wellness protocol covering the four most prevalent US health challenges (obesity, poor sleep, chronic stress, metabolic health) was authored specifically for this project. It is grounded in established health guidelines and serves as a realistic stand-in for any real protocol document, which can be swapped in by dropping a PDF into the `/docs` folder.

**Tone enforcement**  
The "warm, clear, not clinical, not fluffy" constraint is enforced through explicit rules in every system prompt: no emojis, no filler phrases ("great question", "well done"), direct answers, 2-4 sentences maximum. This is re-stated in each prompt rather than relying on the model's default behavior.

---

## What a Production Version Would Add

- Persistent session storage (Redis or PostgreSQL)
- User authentication
- Day progression logic (auto-increment day counter daily)
- Push notifications for daily check-in reminders
- Vector-based RAG for larger protocol documents
- Multiple protocol documents per user
- Analytics dashboard for coaches to monitor patient progress
