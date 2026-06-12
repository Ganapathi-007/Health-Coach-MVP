"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

const API = "http://localhost:8000";

function HealthCoach() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sessionId, setSessionId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("onboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rawText, setRawText] = useState("");
  const [welcome, setWelcome] = useState("");

  const [checkinDay, setCheckinDay] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [checkinPhase, setCheckinPhase] = useState("idle"); // idle | answering | done
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [coaching, setCoaching] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const sid = searchParams.get("session_id");
    if (sid) {
      setSessionId(sid);
      setTab("checkin");
    }
  }, [searchParams]);

  function updateUrl(sid) {
    router.replace(`/?session_id=${sid}`, { scroll: false });
  }

  async function handleOnboard() {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setProfile(data.profile);
      setWelcome(data.welcome_message);
      updateUrl(data.session_id);
    } catch {
      setError("Could not reach the backend. Make sure uvicorn is running on port 8000.");
    }
    setLoading(false);
  }

  async function handleCheckin() {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers(["", "", ""]);
    setCurrentAnswer("");
    setCurrentQ(0);
    setCoaching("");
    setCheckinPhase("idle");
    try {
      const res = await fetch(`${API}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      setCheckinDay(data.day);
      setQuestions(data.questions);
      setCheckinPhase("answering");
    } catch {
      setError("Could not reach the backend.");
    }
    setLoading(false);
  }

  async function handleNextAnswer() {
    if (!currentAnswer.trim()) return;
    const updated = [...answers];
    updated[currentQ] = currentAnswer;
    setAnswers(updated);
    setCurrentAnswer("");

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // All answered — submit
      setLoading(true);
      try {
        const res = await fetch(`${API}/checkin/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, questions, responses: updated }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "API error");
        setCoaching(data.coaching);
        setCheckinPhase("done");
      } catch (e) {
        setError(`Could not get coach feedback: ${e.message}`);
        setCheckinPhase("done");
      }
      setLoading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim() || !sessionId) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question }),
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setError("Could not reach the backend.");
    }
    setLoading(false);
  }

  const currentDay = profile?.current_day ?? 1;
  const progressPct = Math.round((currentDay / 30) * 100);

  const navItems = [
    { key: "onboard", icon: "◎", label: "Onboard" },
    { key: "checkin", icon: "✓", label: "Daily Check-in", requiresSession: true },
    { key: "ask", icon: "?", label: "Ask your coach", requiresSession: true },
  ];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🌿</div>
          <div>
            <h1>Health Coach</h1>
            <p>30-day wellness program</p>
          </div>
        </div>

        <div className="nav-label">Menu</div>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${tab === item.key ? "active" : ""} ${item.requiresSession && !sessionId ? "disabled" : ""}`}
            onClick={() => !( item.requiresSession && !sessionId) && setTab(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="sidebar-spacer" />

        {sessionId && (
          <div className="progress-section">
            <div className="progress-label">
              Day <span>{currentDay}</span> of 30
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="session-link">
              <span>Shareable link</span>
              {typeof window !== "undefined"
                ? `${window.location.origin}/?session_id=${sessionId}`
                : ""}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main">

        {tab === "onboard" && (
          <>
            <div className="page-header">
              <h2>Welcome — let's get started</h2>
              <p>Tell me about yourself and I'll build your personalized 30-day plan.</p>
            </div>

            <div className="card">
              <div className="card-title">About you</div>
              <textarea
                placeholder="Write freely — your age, sleep habits, health goals, daily routine, anything on your mind. The more you share, the better I can personalize your program."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleOnboard}
                disabled={loading || !rawText.trim()}
              >
                {loading ? "Setting up your profile…" : "Start my 30-day program →"}
              </button>
              {error && <p className="error">{error}</p>}
              {welcome && <div className="welcome-box">{welcome}</div>}
            </div>

            {profile && (
              <div className="card">
                <div className="card-title">Your profile</div>
                <div className="profile-grid">
                  <div className="profile-stat">
                    <div className="stat-label">Age</div>
                    <div className="stat-value">{profile.age ?? "—"}</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-label">Sleep</div>
                    <div className="stat-value">{profile.sleep_hours ? `${profile.sleep_hours} hrs` : "—"}</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-label">Day</div>
                    <div className="stat-value">{profile.current_day} / 30</div>
                  </div>
                </div>

                {profile.goals?.length > 0 && (
                  <div className="profile-stat" style={{ marginTop: 16 }}>
                    <div className="stat-label">Goals</div>
                    <div className="tag-list">
                      {profile.goals.map((g, i) => <span key={i} className="tag">{g}</span>)}
                    </div>
                  </div>
                )}

                {profile.current_habits?.length > 0 && (
                  <div className="profile-stat" style={{ marginTop: 12 }}>
                    <div className="stat-label">Current habits</div>
                    <div className="tag-list">
                      {profile.current_habits.map((h, i) => <span key={i} className="tag">{h}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === "checkin" && (
          <>
            <div className="page-header">
              <h2>Daily Check-in</h2>
              <p>Answer 3 quick questions — your coach will respond after.</p>
            </div>
            <div className="card">
              {checkinPhase === "idle" && (
                <button className="btn-primary" onClick={handleCheckin} disabled={loading}>
                  {loading ? "Getting your questions…" : "Start today's check-in"}
                </button>
              )}

              {checkinPhase === "answering" && questions.length > 0 && (
                <>
                  <div className="day-badge">Day {checkinDay} — Question {currentQ + 1} of {questions.length}</div>
                  <div className="question-item" style={{ marginBottom: 20 }}>
                    <div className="q-number">{currentQ + 1}</div>
                    <span>{questions[currentQ]}</span>
                  </div>
                  <textarea
                    placeholder="Type your answer here…"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    style={{ minHeight: 90 }}
                    autoFocus
                  />
                  <button
                    className="btn-primary"
                    onClick={handleNextAnswer}
                    disabled={loading || !currentAnswer.trim()}
                  >
                    {loading ? "Submitting…" : currentQ < questions.length - 1 ? "Next →" : "Done — get feedback →"}
                  </button>
                </>
              )}

              {checkinPhase === "done" && (
                <>
                  <div className="day-badge">Day {checkinDay} — Complete</div>
                  <div style={{ marginBottom: 20 }}>
                    {questions.map((q, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div className="question-item">
                          <div className="q-number">{i + 1}</div>
                          <span>{q}</span>
                        </div>
                        <div style={{ paddingLeft: 16, marginTop: 6, fontSize: 14, color: "#555", fontStyle: "italic" }}>
                          {answers[i]}
                        </div>
                      </div>
                    ))}
                  </div>
                  {coaching && (
                    <div className="answer-box">
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#4a7c59", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Coach's response</div>
                      <ReactMarkdown>{coaching}</ReactMarkdown>
                    </div>
                  )}
                  <button className="btn-primary" onClick={handleCheckin} style={{ marginTop: 16 }}>
                    Get more questions
                  </button>
                </>
              )}

              {error && <p className="error">{error}</p>}
            </div>
          </>
        )}

        {tab === "ask" && (
          <>
            <div className="page-header">
              <h2>Ask your coach</h2>
              <p>Answers come strictly from your wellness protocol — no guessing.</p>
            </div>
            <div className="card">
              <input
                type="text"
                placeholder="e.g. Can I have coffee? What should I eat for breakfast?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button
                className="btn-primary"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
              >
                {loading ? "Thinking…" : "Ask →"}
              </button>
              <p className="hint">Press Enter to send</p>
              {error && <p className="error">{error}</p>}
              {answer && (
                <div className="answer-box">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <HealthCoach />
    </Suspense>
  );
}
