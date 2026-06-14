"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@supabase/supabase-js";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key"
);

function HealthCoach() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const signingUp = useRef(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

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
  const [checkinPhase, setCheckinPhase] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [progressSummary, setProgressSummary] = useState("");
  const [progressCount, setProgressCount] = useState(0);
  const [progressHasComparison, setProgressHasComparison] = useState(false);

  useEffect(() => {
    if (sessionId && profile && tab === "onboard") {
      setTab("checkin");
    }
  }, [sessionId, profile]);

  useEffect(() => {
    if (tab === "progress" && sessionId && progressCount === 0 && !progressSummary) {
      handleProgress();
    }
  }, [tab]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (signingUp.current) return;
        const user = session?.user ?? null;
        setAuthUser(user);

        if (user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Pre-fill name from Google profile
          const googleName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          if (googleName) setFormName(googleName);

          // Try to restore existing health coach session
          try {
            const res = await fetch(`${API}/auth/me`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id }),
            });
            if (res.ok) {
              const data = await res.json();
              setSessionId(data.session_id);
              setProfile(data.profile);
              setWelcome(data.welcome_message);
              setTab("checkin");
            }
          } catch {}
        }

        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleAuth() {
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    setLoginError("");
    if (authMode === "signup") {
      signingUp.current = true;
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });
      if (error) {
        signingUp.current = false;
        setLoginError(error.message);
      } else {
        if (data.session) await supabase.auth.signOut();
        signingUp.current = false;
        setLoginPassword("");
        setLoginError("");
        setLoginSuccess("Account created! Now sign in with your credentials.");
        setAuthMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });
      if (error) setLoginError(error.message);
    }
    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setSessionId(null);
    setProfile(null);
    setWelcome("");
    setFormName("");
    setFormAge("");
    setFormWeight("");
    setFormHeight("");
    setFormConcerns("");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setLoginSuccess("");
    setAuthMode("signin");
    setTab("onboard");
    router.replace("/", { scroll: false });
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
        body: JSON.stringify({ raw_text: rawText, user_id: authUser?.id }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setProfile(data.profile);
      setWelcome(data.welcome_message);
      setTab("checkin");
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
      const initialMessages = [];
      if (data.missed_days >= 1) {
        const missedText = data.missed_days === 1
          ? "You missed yesterday's check-in. Consistency is what makes this work — one missed day is fine, but make it the exception. Let's get back on track."
          : `You've been away for ${data.missed_days} days. That's a gap worth noticing. Daily check-ins are what build momentum — let's not lose what you've started.`;
        initialMessages.push({ role: "coach", text: missedText });
      }
      initialMessages.push({ role: "coach", text: data.questions[0] });
      setMessages(initialMessages);
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
          setMessages(prev => [...prev, { role: "coach", text: data.coaching, feedback: true, commitment: data.commitment }]);
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

  async function handleProgress() {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    setProgressSummary("");
    try {
      const res = await fetch(`${API}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      setProgressSummary(data.summary);
      setProgressCount(data.check_in_count);
      setProgressHasComparison(data.has_comparison);
    } catch {
      setError("Could not reach the backend.");
    }
    setLoading(false);
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
    { key: "progress", icon: "↗", label: "Progress", requiresSession: true },
    { key: "ask", icon: "?", label: "Ask your coach", requiresSession: true },
  ];

  // ── Loading auth state ──
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <div className="logo-icon" style={{ margin: "0 auto 16px", width: 48, height: 48, fontSize: 24 }}>🌿</div>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not logged in → show login screen ──
  if (!authUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🌿</div>
          <h1>Health Coach</h1>
          <p>Your personal 30-day wellness program, powered by AI.</p>
          <div className="auth-toggle">
            <button
              className={authMode === "signin" ? "auth-toggle-btn active" : "auth-toggle-btn"}
              onClick={() => { setAuthMode("signin"); setLoginError(""); setLoginSuccess(""); }}
            >Sign in</button>
            <button
              className={authMode === "signup" ? "auth-toggle-btn active" : "auth-toggle-btn"}
              onClick={() => { setAuthMode("signup"); setLoginError(""); setLoginSuccess(""); }}
            >Create account</button>
          </div>
          <input
            type="email"
            className="login-email-input"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          <input
            type="password"
            className="login-email-input"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          <button
            className="btn-primary login-btn"
            onClick={handleAuth}
            disabled={!loginEmail.trim() || !loginPassword.trim() || loginLoading}
          >
            {loginLoading ? "Please wait…" : authMode === "signup" ? "Create account →" : "Sign in →"}
          </button>
          {loginSuccess && <p className="login-success">{loginSuccess}</p>}
          {loginError && <p className="error" style={{ marginTop: 10 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  // ── Logged in → main app ──
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
            onClick={() => !(item.requiresSession && !sessionId) && setTab(item.key)}
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
            {profile?.program_route && (
              <div className="route-label">
                {{
                  anxiety: "Anxiety Track",
                  weight_loss: "Weight Loss Track",
                  skin: "Skin Health Track",
                  energy: "Energy Track",
                  behavioral: "Behavioral Track",
                  general: "General Wellness Track",
                }[profile.program_route] ?? "Wellness Track"}
              </div>
            )}
          </div>
        )}

        <div className="user-section">
          <div className="user-email">{authUser.email}</div>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
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
                          {msg.commitment && (
                            <div className="commitment-card">
                              <div className="commitment-label">Your commitment for tomorrow</div>
                              <div className="commitment-text">{msg.commitment}</div>
                            </div>
                          )}
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

        {tab === "progress" && (
          <>
            <div className="page-header">
              <h2>Progress</h2>
              <p>Patterns and trends across your check-ins, analyzed by your coach.</p>
            </div>
            <div className="card">
              {progressCount < 3 && !progressSummary ? (
                <div className="progress-empty">
                  <p>You need at least 3 completed check-ins for a progress report.</p>
                  <p style={{ marginTop: 8, color: "#aaa" }}>You have {progressCount} so far. Keep checking in daily.</p>
                </div>
              ) : (
                <>
                  <button className="btn-primary" onClick={handleProgress} disabled={loading}>
                    {loading ? "Analyzing your check-ins…" : progressSummary ? "Refresh report" : "Generate progress report"}
                  </button>
                  {progressSummary && (
                    <div className="progress-report">
                      <div className="progress-report-meta">
                        {progressHasComparison
                          ? `Based on your last 14 check-ins — comparing this week to last week`
                          : `Based on your last ${progressCount} check-ins`}
                      </div>
                      <ReactMarkdown>{progressSummary}</ReactMarkdown>
                    </div>
                  )}
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
