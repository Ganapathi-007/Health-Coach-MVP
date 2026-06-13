"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function HealthCoach() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sessionId, setSessionId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("onboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formConcerns, setFormConcerns] = useState("");
  const [welcome, setWelcome] = useState("");

  const [checkinDay, setCheckinDay] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [checkinPhase, setCheckinPhase] = useState("idle"); // idle | chatting | done
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const chatEndRef = useState(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const sid = searchParams.get("session_id");
    if (sid && !sessionId) {
      setSessionId(sid);
      setTab("checkin");
    }
  }, []);

  function updateUrl(sid) {
    router.replace(`/?session_id=${sid}`, { scroll: false });
  }

  async function handleOnboard() {
    if (!formConcerns.trim()) return;
    setLoading(true);
    setError("");
    try {
      const rawText = [
        formName && `Name: ${formName}`,
        formAge && `Age: ${formAge}`,
        formWeight && `Weight: ${formWeight}`,
        formHeight && `Height: ${formHeight}`,
        `Health concerns and goals: ${formConcerns}`,
      ].filter(Boolean).join("\n");
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
    setMessages([]);
    setAnswers([]);
    setCurrentQ(0);
    setChatInput("");
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
      setMessages([{ role: "coach", text: data.questions[0] }]);
      setCurrentQ(0);
      setCheckinPhase("chatting");
    } catch {
      setError("Could not reach the backend.");
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!chatInput.trim() || checkinPhase !== "chatting") return;

    const userText = chatInput.trim();
    setChatInput("");
    const updatedAnswers = [...answers, userText];
    setAnswers(updatedAnswers);
    setMessages(prev => [...prev, { role: "user", text: userText }]);

    const nextQ = currentQ + 1;

    if (nextQ < questions.length) {
      setCurrentQ(nextQ);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "coach", text: questions[nextQ] }]);
      }, 400);
    } else {
      setLoading(true);
      setTimeout(async () => {
        try {
          const res = await fetch(`${API}/checkin/respond`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, questions, responses: updatedAnswers }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "API error");
          setMessages(prev => [...prev, { role: "coach", text: data.coaching, feedback: true }]);
          setProfile(prev => prev ? { ...prev, current_day: data.new_day } : prev);
          setCheckinPhase("done");
        } catch (e) {
          setError(`Could not get coach feedback: ${e.message}`);
          setCheckinPhase("done");
        }
        setLoading(false);
      }, 400);
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
              <div className="intake-grid">
                <div className="intake-field">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="intake-field">
                  <label>Age</label>
                  <input
                    type="number"
                    placeholder="Years"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                  />
                </div>
                <div className="intake-field">
                  <label>Weight</label>
                  <input
                    type="text"
                    placeholder="e.g. 70 kg"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                  />
                </div>
                <div className="intake-field">
                  <label>Height</label>
                  <input
                    type="text"
                    placeholder="e.g. 175 cm"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                  />
                </div>
              </div>
              <div className="intake-field" style={{ marginTop: 20 }}>
                <label>What brings you here?</label>
                <textarea
                  placeholder="Your health goals, concerns, current habits, sleep schedule — anything on your mind. The more you share, the better I can personalize your program."
                  value={formConcerns}
                  onChange={(e) => setFormConcerns(e.target.value)}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleOnboard}
                disabled={loading || !formConcerns.trim()}
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
                    <div className="stat-label">Name</div>
                    <div className="stat-value">{profile.name ?? "—"}</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-label">Age</div>
                    <div className="stat-value">{profile.age ?? "—"}</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-label">Weight</div>
                    <div className="stat-value">{profile.weight ?? "—"}</div>
                  </div>
                  <div className="profile-stat">
                    <div className="stat-label">Height</div>
                    <div className="stat-value">{profile.height ?? "—"}</div>
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
              <p>Chat with your coach — questions adapt to your progress.</p>
            </div>
            <div className="card">
              {checkinPhase === "idle" && (
                <button className="btn-primary" onClick={handleCheckin} disabled={loading}>
                  {loading ? "Getting your questions…" : "Start today's check-in"}
                </button>
              )}

              {(checkinPhase === "chatting" || checkinPhase === "done") && (
                <div className="chat-wrapper">
                  {checkinDay && (
                    <div className="chat-day-badge">
                      <span className="day-badge">Day {checkinDay}</span>
                    </div>
                  )}
                  <div className="chat-window">
                    {messages.map((msg, i) => (
                      <div key={i} className={`chat-bubble-row ${msg.role}`}>
                        {msg.role === "coach" && (
                          <div className="chat-avatar">🌿</div>
                        )}
                        <div className={`chat-bubble ${msg.role} ${msg.feedback ? "feedback" : ""}`}>
                          {msg.feedback
                            ? <ReactMarkdown>{msg.text}</ReactMarkdown>
                            : msg.text}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="chat-bubble-row coach">
                        <div className="chat-avatar">🌿</div>
                        <div className="chat-bubble coach" style={{ color: "#aaa", fontStyle: "italic" }}>
                          Thinking…
                        </div>
                      </div>
                    )}
                  </div>

                  {checkinPhase === "chatting" && (
                    <div className="chat-input-row">
                      <input
                        type="text"
                        placeholder="Type your answer…"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        autoFocus
                        disabled={loading}
                      />
                      <button className="chat-send-btn" onClick={handleSend} disabled={loading || !chatInput.trim()}>
                        →
                      </button>
                    </div>
                  )}

                  {checkinPhase === "done" && (
                    <>
                      <p className="chat-done-note">Check back tomorrow for Day {(checkinDay || 1) + 1}.</p>
                      <button className="btn-primary" onClick={handleCheckin} style={{ marginTop: 12 }}>
                        Get more questions
                      </button>
                    </>
                  )}
                </div>
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
