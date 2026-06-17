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

const TRACK_WEEKS = {
  anxiety: [
    { title: "Awareness & Physiology", focus: "Stress response education, baseline mood tracking, diaphragmatic breathing as a daily anchor" },
    { title: "Pattern Recognition", focus: "Worry journaling, scheduled worry time, thought awareness, values reflection" },
    { title: "Skill Building", focus: "Thought records, ACT defusion techniques, gratitude journaling, deepening mindfulness" },
    { title: "Committed Action", focus: "Behavioral activation, personal stress toolkit, relapse prevention plan" },
  ],
  weight_loss: [
    { title: "Baseline & Motivation", focus: "Self-awareness through food monitoring only — no restrictions yet — and intrinsic motivation" },
    { title: "Habit Architecture", focus: "Environmental design, implementation intentions, the sleep-hunger connection" },
    { title: "Stress, Emotions & Non-Scale Wins", focus: "Emotional eating patterns, mindful eating, expanding progress beyond the scale" },
    { title: "Identity & Maintenance", focus: "Identity shift, high-risk situation planning, sustainable life beyond 30 days" },
  ],
  skin: [
    { title: "Reset & Eliminate", focus: "Remove inflammatory inputs, start a skin + food + mood diary, hydration baseline" },
    { title: "Gut Rebuilding", focus: "Fermented foods, prebiotic vegetables, omega-3 sources, sleep for skin repair" },
    { title: "Stress & Cortisol", focus: "HPA axis education, daily mindfulness, circadian sleep anchoring, gratitude journaling" },
    { title: "Personalization & Reintroduction", focus: "Systematic food reintroduction, personal trigger map, long-term habit plan" },
  ],
  energy: [
    { title: "Remove & Measure", focus: "Fixed wake time, sleep diary, caffeine cutoff at 2pm, morning light exposure" },
    { title: "Circadian Anchoring", focus: "Light management, 12-hour eating window, stimulus control, evening wind-down" },
    { title: "Nutrition Timing & Movement", focus: "Protein-rich breakfast, morning walk, meal timing to prevent energy crashes" },
    { title: "Integration & Optimization", focus: "Review energy gains, contingency plans for disruptions, 90-day maintenance" },
  ],
  behavioral: [
    { title: "Trigger Awareness", focus: "Habit loop logging, values clarification, psychoeducation on dopamine and habits" },
    { title: "Habit Replacement", focus: "Replacement behaviors for each major trigger, urge surfing with the RAIN method" },
    { title: "Stress Testing", focus: "HALT vulnerability check-in, high-risk situation pre-planning, DBT emotion regulation" },
    { title: "Accountability & Forward Momentum", focus: "Relapse prevention plan, identity narrative, self-compassion for setbacks" },
  ],
  general: [
    { title: "Sleep Foundation", focus: "Consistent wake time, phone out of bedroom, tiny habits anchored to existing routines" },
    { title: "Nervous System", focus: "Daily breath practice, evening wind-down, daily stress-shedding ritual" },
    { title: "Nutrition Foundation", focus: "Add-don't-subtract approach, protein at breakfast, environmental design for healthy defaults" },
    { title: "Movement & Connection", focus: "3x/week movement, accountability partner, identity-based habit framing" },
  ],
};

const TRACK_LABELS = {
  anxiety: "Anxiety & Stress Track",
  weight_loss: "Weight Loss Track",
  skin: "Skin Health Track",
  energy: "Energy & Sleep Track",
  behavioral: "Behavioral Change Track",
  general: "General Wellness Track",
};

function HealthCoach() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const signingUp = useRef(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup" | "forgot" | "reset"
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

  const [showOnboardForm, setShowOnboardForm] = useState(false);

  const [checkinDay, setCheckinDay] = useState(null);
  const [checkinPhase, setCheckinPhase] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

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

        if (event === "PASSWORD_RECOVERY") {
          setAuthMode("reset");
          setAuthLoading(false);
          return;
        }

        const user = session?.user ?? null;
        setAuthUser(user);

        if (user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Pre-fill name from Google profile
          const googleName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          if (googleName) setFormName(googleName);

          // Try to restore existing health coach session (with retry for cold starts)
          const loadSession = async (attempt = 0) => {
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
                setBackendError(false);
              }
              // 404 = no session yet (new user), fall through to onboarding normally
            } catch {
              if (attempt < 4) {
                setBackendError(true);
                setTimeout(() => loadSession(attempt + 1), 4000);
              } else {
                setBackendError(false); // give up, let them re-onboard or retry manually
              }
            }
          };
          await loadSession();
        }

        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleForgotPassword() {
    if (!loginEmail.trim()) return;
    setLoginLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginSuccess("Password reset email sent. Check your inbox.");
    }
    setLoginLoading(false);
  }

  async function handleResetPassword() {
    if (!loginPassword.trim()) return;
    setLoginLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.updateUser({ password: loginPassword.trim() });
    if (error) {
      setLoginError(error.message);
    } else {
      await supabase.auth.signOut();
      setLoginPassword("");
      setLoginError("");
      setLoginSuccess("Password updated. Sign in with your new password.");
      setAuthMode("signin");
    }
    setLoginLoading(false);
  }

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
      setShowOnboardForm(false);
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
    setConversationHistory([]);
    setChatInput("");
    setCheckinPhase("idle");
    try {
      const res = await fetch(`${API}/checkin/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      setCheckinDay(data.day);

      const initialMessages = [];
      if (data.missed_days >= 1) {
        const missedText = data.missed_days === 1
          ? "You missed yesterday's check-in. Consistency is what makes this work — one missed day is fine, but make it the exception."
          : `You've been away for ${data.missed_days} days. Daily check-ins are what build momentum — let's get back on track.`;
        initialMessages.push({ role: "coach", text: missedText });
      }
      initialMessages.push({ role: "coach", text: data.opening });
      setMessages(initialMessages);
      setConversationHistory([{ role: "coach", text: data.opening }]);
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

    const updatedHistory = [...conversationHistory, { role: "user", text: userText }];
    setConversationHistory(updatedHistory);
    setMessages(prev => [...prev, { role: "user", text: userText }]);

    setLoading(true);
    try {
      const res = await fetch(`${API}/checkin/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, history: updatedHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "API error");

      const newHistory = [...updatedHistory, { role: "coach", text: data.reply }];
      setConversationHistory(newHistory);
      setMessages(prev => [...prev, {
        role: "coach",
        text: data.reply,
        feedback: data.is_final,
        commitment: data.commitment,
      }]);

      if (data.is_final) {
        setProfile(prev => prev ? { ...prev, current_day: data.new_day } : prev);
        setCheckinPhase("done");
      }
    } catch (e) {
      setError(`Could not get coach response: ${e.message}`);
    }
    setLoading(false);
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
    { key: "onboard", icon: "◎", label: "Onboard", mobileLabel: "Profile" },
    { key: "checkin", icon: "✓", label: "Daily Check-in", mobileLabel: "Check-in", requiresSession: true },
    { key: "progress", icon: "↗", label: "Progress", mobileLabel: "Progress", requiresSession: true },
    { key: "ask", icon: "?", label: "Ask your coach", mobileLabel: "Ask", requiresSession: true },
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

  // ── Backend cold start — show reconnecting instead of blank onboarding ──
  if (backendError) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <div className="logo-icon" style={{ margin: "0 auto 16px", width: 48, height: 48, fontSize: 24 }}>🌿</div>
          <p style={{ marginBottom: 8 }}>Reconnecting to your session…</p>
          <p style={{ fontSize: 13, color: "#888" }}>The server is waking up. This takes about 30 seconds.</p>
        </div>
      </div>
    );
  }

  // ── Not logged in → show login screen ──
  if (!authUser && authMode !== "reset") {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🌿</div>
          <h1>Health Coach</h1>
          <p>Your personal 30-day wellness program, powered by AI.</p>

          {authMode !== "forgot" && (
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
          )}

          <input
            type="email"
            className="login-email-input"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (authMode === "forgot" ? handleForgotPassword() : handleAuth())}
          />

          {authMode !== "forgot" && (
            <input
              type="password"
              className="login-email-input"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
          )}

          <button
            className="btn-primary login-btn"
            onClick={authMode === "forgot" ? handleForgotPassword : handleAuth}
            disabled={!loginEmail.trim() || (authMode !== "forgot" && !loginPassword.trim()) || loginLoading}
          >
            {loginLoading ? "Please wait…" : authMode === "signup" ? "Create account →" : authMode === "forgot" ? "Send reset link →" : "Sign in →"}
          </button>

          {authMode === "signin" && (
            <button className="forgot-link" onClick={() => { setAuthMode("forgot"); setLoginError(""); setLoginSuccess(""); }}>
              Forgot password?
            </button>
          )}
          {authMode === "forgot" && (
            <button className="forgot-link" onClick={() => { setAuthMode("signin"); setLoginError(""); setLoginSuccess(""); }}>
              Back to sign in
            </button>
          )}

          {loginSuccess && <p className="login-success">{loginSuccess}</p>}
          {loginError && <p className="error" style={{ marginTop: 10 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  // ── Password reset screen ──
  if (authMode === "reset") {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🌿</div>
          <h1>Set new password</h1>
          <p>Enter a new password for your account.</p>
          <input
            type="password"
            className="login-email-input"
            placeholder="New password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
          />
          <button
            className="btn-primary login-btn"
            onClick={handleResetPassword}
            disabled={!loginPassword.trim() || loginLoading}
          >
            {loginLoading ? "Updating…" : "Set new password →"}
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
            {/* ── Already onboarded: show profile + track roadmap ── */}
            {profile && !showOnboardForm && (
              <>
                <div className="page-header">
                  <h2>Welcome back{profile.name ? `, ${profile.name}` : ""}.</h2>
                  <p>Your 30-day program is active — Day {currentDay} of 30.</p>
                </div>

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

                  <button className="btn-secondary" style={{ marginTop: 20 }} onClick={() => setShowOnboardForm(true)}>
                    Update profile
                  </button>
                </div>

                <div className="card">
                  <div className="card-title">
                    Your 30-day roadmap
                    {profile.program_route && (
                      <span className="track-name-badge">{TRACK_LABELS[profile.program_route] ?? "Wellness Track"}</span>
                    )}
                  </div>
                  {(() => {
                    const route = profile.program_route || "general";
                    const weeks = TRACK_WEEKS[route] || TRACK_WEEKS.general;
                    const currentWeekIdx = Math.min(Math.floor((currentDay - 1) / 7), 3);
                    return (
                      <div className="track-overview">
                        {weeks.map((week, i) => (
                          <div key={i} className={`track-week${i === currentWeekIdx ? " current" : i < currentWeekIdx ? " completed" : ""}`}>
                            <div className="track-week-header">
                              <span className="track-week-num">Week {i + 1}</span>
                              <span className="track-week-title">{week.title}</span>
                              {i === currentWeekIdx && <span className="track-week-badge">You are here</span>}
                              {i < currentWeekIdx && <span className="track-week-badge done">✓ Done</span>}
                            </div>
                            <div className="track-week-focus">{week.focus}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="mobile-signout">
                  <span className="mobile-user-email">{authUser.email}</span>
                  <button className="btn-logout" onClick={handleLogout}>Sign out</button>
                </div>
              </>
            )}

            {/* ── Not yet onboarded or updating profile ── */}
            {(!profile || showOnboardForm) && (
              <>
                <div className="page-header">
                  {showOnboardForm ? (
                    <>
                      <h2>Update your profile</h2>
                      <p>Your answers will rebuild your personalized 30-day plan.</p>
                    </>
                  ) : (
                    <>
                      <h2>Welcome — let's get started</h2>
                      <p>Tell me about yourself and I'll build your personalized 30-day plan.</p>
                    </>
                  )}
                </div>

                {showOnboardForm && (
                  <button className="btn-secondary" style={{ marginBottom: 16 }} onClick={() => setShowOnboardForm(false)}>
                    ← Back to profile
                  </button>
                )}

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
                    {loading ? "Setting up your profile…" : showOnboardForm ? "Update my program →" : "Start my 30-day program →"}
                  </button>
                  {error && <p className="error">{error}</p>}
                  {welcome && <div className="welcome-box">{welcome}</div>}
                </div>
              </>
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
                          <div className="chat-avatar"><img src="/coach.png" alt="Coach" /></div>
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
                        <div className="chat-avatar"><img src="/coach.png" alt="Coach" /></div>
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
                    <div className="chat-done-actions">
                      <p className="chat-done-note">Session complete. Check back tomorrow for Day {(checkinDay || 1) + 1}.</p>
                      <button className="btn-talk-more" onClick={() => setCheckinPhase("chatting")}>
                        I want to talk more
                      </button>
                    </div>
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
                placeholder={{
                  anxiety: "e.g. How do I do box breathing? What is scheduled worry time?",
                  weight_loss: "e.g. What is mindful eating? How do I handle emotional eating?",
                  skin: "e.g. Which foods should I avoid? How does stress affect my skin?",
                  energy: "e.g. What is stimulus control? How does caffeine affect sleep?",
                  behavioral: "e.g. What is the RAIN technique? How do I handle urges?",
                  general: "e.g. What is the sleep foundation habit? How do I build a wind-down routine?",
                }[profile?.program_route] ?? "Ask anything about your program or this week's techniques…"}
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

      {/* Bottom nav — mobile only */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${tab === item.key ? "active" : ""} ${item.requiresSession && !sessionId ? "disabled" : ""}`}
            onClick={() => !(item.requiresSession && !sessionId) && setTab(item.key)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.mobileLabel}</span>
          </button>
        ))}
      </nav>
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
