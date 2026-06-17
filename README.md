# Health Coach AI

A 30-day personalized wellness coaching agent powered by Claude Sonnet 4.6. Conducts daily conversational check-ins, remembers what you share across sessions, and delivers evidence-based coaching across six health tracks.

**Live:** [health-coach-mvp-six.vercel.app](https://health-coach-mvp-six.vercel.app)

---

## What it does

- **Conversational check-ins** — daily coach-driven dialogue, not a form. The coach responds to what you actually say, covers weekly topics organically, and ends the session when it feels natural.
- **Persistent memory** — remembers specific details across sessions. Builds a running client profile after every check-in so it never re-asks what you've already shared.
- **6 health tracks** — routed automatically from your onboarding description, each with a 4-week evidence-based curriculum.
- **Safety guardrails** — track-specific constraints injected into every Claude call. Knows when to stop coaching and refer to a professional.
- **Progress analysis** — pattern detection across your check-in history.
- **Protocol Q&A** — ask your coach anything; answers are grounded in your track's reference document.

---

## Tracks

| Track | Evidence Base |
|---|---|
| Anxiety & Stress | MBSR, CBT, ACT |
| Weight Loss | NIH/CDC DPP, Motivational Interviewing |
| Skin Health | Gut-skin axis, IFM 5R Protocol |
| Energy & Sleep | CBT-I, Borbely 2-Process Model, TRE |
| Behavioral Change | Duhigg habit loop, Marlatt relapse prevention |
| General Wellness | ACLM 6 Pillars, Blue Zones, Fogg Tiny Habits |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (React), deployed on Vercel |
| Backend | FastAPI (Python), deployed on Render |
| Database | Supabase (PostgreSQL + JSONB) |
| Auth | Supabase Auth |
| AI | Claude Sonnet 4.6 via Anthropic SDK |

---

## Architecture highlights

**Conversational agent loop** — `/checkin/start` generates a personalized opening referencing your last commitment by name. `/checkin/turn` handles each exchange. Claude signals session end with `[END_SESSION]` — no hard exchange limits.

**Hybrid memory system** — two layers injected into every prompt:
1. *Client summary* — synthesized after every session, grows across 30 days, no word limit
2. *Verbatim recent sessions* — last 3 check-ins in full, preserves specific detail that summarization loses

**Background tasks** — summary update runs as a FastAPI `BackgroundTask` so the final coaching response returns immediately without waiting for a second Claude call.

**JSONB storage** — entire session state (profile, check-ins, client summary, commitments) stored as one document per user. Zero schema migrations as the data model evolved.

---

## Project structure

```
├── backend/
│   ├── agent.py        # All Claude calls, PROGRAM_ROUTES, TRACK_GUARDRAILS, memory
│   ├── main.py         # FastAPI endpoints
│   ├── models.py       # Pydantic models
│   └── memory.py       # Supabase session storage
└── frontend/
    └── app/
        ├── page.js     # Full React app
        └── globals.css # All styles
```

---

## Technical Report

See [`Technical Report HealthAI.pdf`](./Technical%20Report%20HealthAI.pdf) for the full write-up covering system architecture, agentic design decisions, evidence-based track design, and memory architecture.
