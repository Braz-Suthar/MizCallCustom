import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FiHome, FiMic, FiSettings, FiLogOut, FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Screen = "login" | "register";
type Mode = "host" | "user";
type NavTab = "dashboard" | "recordings" | "settings";

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="pill">{children}</span>
);

const Button = ({
  label,
  onClick,
  variant = "primary",
  loading,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) => (
  <button
    className={`btn btn-${variant}`}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? "…" : label}
  </button>
);

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <label className="field">
    <span>{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  </label>
);

const Login = ({
  goRegister,
  onBack,
  onSubmit,
  loading,
  error,
}: {
  goRegister: () => void;
  onBack: () => void;
  onSubmit: (payload: { identifier: string; password: string }) => void;
  loading: boolean;
  error: string | null;
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const disable = useMemo(
    () =>
      !password.trim() || !identifier.trim(),
    [identifier, password],
  );

  return (
    <div className="auth-shell">
      <div className="auth-left single">
        <div className="logo-wrap">
          <img src="/assets/Icons_and_logos_4x/white_logo.png" alt="MizCall" className="logo-img" />
        </div>
        <div className="auth-card flat">
          <div className="stack gap-xxs center">
            <h2 className="title auth-title">Sign in to your account</h2>
            <p className="muted small">
              Or <button className="linklike" onClick={goRegister}>create a new account</button>
            </p>
          </div>

          <Input
            label="Email or User ID"
            value={identifier}
            onChange={setIdentifier}
            placeholder="Email or User ID"
            autoFocus
          />

          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Password"
            type="password"
          />

          <div className="flex between">
            <span />
            <button className="linklike">Forgot your password?</button>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <Button
            label={loading ? "Signing in…" : "Sign in"}
            disabled={disable || loading}
            onClick={() =>
              onSubmit({
                identifier,
                password,
              })
            }
          />
        </div>
      </div>
      <div className="auth-right empty" />
    </div>
  );
};

const Register = ({ goLogin, onBack }: { goLogin: () => void; onBack: () => void }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const passwordsMatch = password === confirm && password.trim().length >= 6;
  const disable = !fullName.trim() || !email.trim() || !passwordsMatch;

  useEffect(() => {
    if (!verifying) return;
    setResendTimer(25);
    const timer = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [verifying]);

  const handleOtpChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);
    if (value && idx < otpRefs.current.length - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i += 1) {
      next[i] = text[i];
    }
    setOtp(next);
    const focusIdx = Math.min(text.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const onVerify = () => {
    // Hook to real verification later
    // showToast could be lifted via props; for now just return
  };

  if (verifying) {
    return (
      <div className="auth-shell">
        <div className="auth-left single">
          <div className="logo-wrap">
            <img src="/assets/Icons_and_logos_4x/white_logo.png" alt="MizCall" className="logo-img" />
          </div>
          <div className="auth-card flat verify-card">
            <div className="stack gap-xxs center">
              <h2 className="title auth-title">Verify your email</h2>
              <p className="muted small">Enter the 6-digit code sent to {email || "your email"}</p>
              <button className="linklike" onClick={() => setVerifying(false)}>Edit details</button>
            </div>
            <div className="otp-row">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  className="otp-input"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  onPaste={handleOtpPaste}
                />
              ))}
            </div>
            <div className="full-width">
              <Button label="Verify" onClick={onVerify} />
            </div>
            <div className="resend-row">
              <span className="muted small">Didn’t receive the code?</span>
              <button
                className="linklike"
                disabled={resendTimer > 0}
                onClick={() => {
                  if (resendTimer > 0) return;
                  setOtp(["", "", "", "", "", ""]);
                  otpRefs.current[0]?.focus();
                  setResendTimer(25);
                }}
              >
                Resend OTP {resendTimer > 0 ? `(${resendTimer}s)` : ""}
              </button>
            </div>
          </div>
        </div>
        <div className="auth-right empty" />
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-left single">
        <div className="logo-wrap">
          <img src="/assets/Icons_and_logos_4x/white_logo.png" alt="MizCall" className="logo-img" />
        </div>
        <div className="auth-card flat">
          <div className="stack gap-xxs center">
            <h2 className="title auth-title">Create host account</h2>
            <p className="muted small">
              Already have an account? <button className="linklike" onClick={goLogin}>Login</button>
            </p>
          </div>

          <Input
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="John Doe"
            autoFocus
          />

          <Input
            label="Email Address"
            value={email}
            onChange={setEmail}
            placeholder="host@example.com"
          />

          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Minimum 6 characters"
            type="password"
          />

          <Input
            label="Confirm Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter password"
            type="password"
          />

          {!passwordsMatch && (password.length > 0 || confirm.length > 0) ? (
            <p className="error">Passwords must match and be at least 6 characters.</p>
          ) : null}

          <div className="full-width">
            <Button label="Continue" disabled={disable} onClick={() => setVerifying(true)} />
          </div>
        </div>
      </div>
      <div className="auth-right empty" />
    </div>
  );
};

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    role: Mode;
    token: string;
    hostId?: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
    password?: string;
  } | null>(null);
  const [tab, setTab] = useState<NavTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [systemPref, setSystemPref] = useState<"light" | "dark">("light");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "info" | "success" | "error" } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    setSystemPref(mql.matches ? "dark" : "light");
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const effectiveTheme = theme === "system" ? systemPref : theme;

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(effectiveTheme === "dark" ? "theme-dark" : "theme-light");
  }, [effectiveTheme]);

  const doLogin = async (payload: { identifier: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.mizcall) {
        throw new Error("Desktop bridge not loaded. Launch via `npm run dev` (Electron), not the browser.");
      }
      const isUser = payload.identifier.trim().toUpperCase().startsWith("U");
      if (!isUser) {
        const data = await window.mizcall?.loginHost?.(payload.identifier, payload.password);
        if (!data) throw new Error("Bridge unavailable");
        setSession({
          role: "host",
          token: data.token,
          hostId: data.hostId,
          name: data.name ?? payload.identifier,
          avatarUrl: data.avatarUrl,
          password: payload.password,
        });
        setScreen("login");
      } else {
        const data = await window.mizcall?.loginUser?.(payload.identifier, payload.password);
        if (!data) throw new Error("Bridge unavailable");
        setSession({
          role: "user",
          token: data.token,
          userId: payload.identifier,
          hostId: data.hostId,
          name: data.name ?? payload.identifier,
          avatarUrl: data.avatarUrl,
          password: payload.password,
        });
        setScreen("login");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const doLogout = () => {
    setSession(null);
    setError(null);
    setScreen("login");
    setTab("dashboard");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied", "success");
    } catch {
      showToast("Copy failed", "error");
    }
  };

  const showToast = (message: string, kind: "info" | "success" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSession((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      showToast("Profile picture updated", "success");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBgClick = () => {
    bgInputRef.current?.click();
  };

  const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setCustomBg(url);
      showToast("Custom background added", "success");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const renderAppShell = () => {
    if (!session) return null;
    const name = session.name ?? (session.role === "host" ? session.hostId : session.userId) ?? "User";
    const initials = name.slice(0, 2).toUpperCase();
    const userId = session.userId ?? session.hostId ?? "N/A";

    const renderContent = () => {
      if (tab === "dashboard") {
        return (
          <div className="stack gap-sm">
            <div className="stats-grid">
              <div className="card stat-card">
                <p className="muted strong">Total Calls</p>
                <h3 className="stat-number">71</h3>
              </div>
              <div className="card stat-card">
                <p className="muted strong">Network Status</p>
                <p className="muted small">Excellent · 99ms</p>
              </div>
              <div className="card stat-card">
                <p className="muted strong">Connection</p>
                <p className="muted small">Connected</p>
              </div>
            </div>

            <div className="grid-2">
              <div className="card stack gap-sm">
                <p className="muted strong">Recent Activity</p>
                <div className="activity-list">
                  {["M642025", "M650583", "M0080694", "M591073", "M780347"].map((id, idx) => (
                    <div key={id} className="activity-item">
                      <span className="activity-icon">📞</span>
                      <div className="stack gap-xxs">
                        <strong>{`Call ${id} ended`}</strong>
                        <span className="muted small">27/12/2025, 4:2{idx} PM</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card stack gap-sm">
                <p className="muted strong">Notifications</p>
                <div className="activity-list">
                  {[
                    "New user onboarded: U123456",
                    "Recording available: main-room",
                    "Network status: Excellent",
                    "Host H844495 started a call",
                  ].map((msg, idx) => (
                    <div key={msg} className="activity-item">
                      <span className="activity-icon">🔔</span>
                      <div className="stack gap-xxs">
                        <strong>{msg}</strong>
                        <span className="muted small">Today · {idx + 1}:00 PM</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (tab === "recordings") {
        return (
          <div className="card stack gap-md">
            <div className="stack gap-xxs">
              <p className="muted">Recordings</p>
              <h2 className="title">Your recordings</h2>
              <p className="muted">No recordings yet. This will list past sessions once implemented.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="stack gap-sm">
          <div className="settings-grid two-col">
            <div className="stack gap-sm">
              <div className="card stack gap-sm">
                <p className="muted strong">Profile</p>
                <div className="profile-row">
                  <div className="avatar-lg">
                    {session.avatarUrl ? <img src={session.avatarUrl} alt="avatar" /> : initials}
                  </div>
                  <div className="stack gap-xxs">
                    <strong>{name}</strong>
                    <span className="muted small">ID: {userId}</span>
                  </div>
                  <Button label="Edit picture" variant="secondary" onClick={handleAvatarClick} />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarFile}
                />
                <div className="info-row">
                  <div>
                    <span className="muted small">User ID</span>
                    <div className="row-inline">
                      <strong>{userId}</strong>
                      <button className="linklike" onClick={() => copyToClipboard(userId)}>Copy</button>
                    </div>
                  </div>
                  <div>
                    <span className="muted small">Password</span>
                    <div className="row-inline">
                      <strong>•••••••</strong>
                      <button
                        className="linklike"
                        onClick={() => session.password && copyToClipboard(session.password)}
                        disabled={!session.password}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card stack gap-sm">
                <p className="muted strong">Call background</p>
                <div className="image-grid">
                  {[
                    "/assets/Icons_and_logos_4x/360.png",
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%232563eb'/></svg>",
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%230f172a'/></svg>",
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%23e5e7eb'/></svg>",
                    ...(customBg ? [customBg] : []),
                  ].map((src) => (
                    <div key={src} className="bg-thumb">
                      <img src={src} alt="background option" />
                    </div>
                  ))}
                </div>
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleBgFile}
                />
                <Button label="Upload custom image" variant="secondary" onClick={handleBgClick} />
              </div>
            </div>

            <div className="stack gap-sm">
              <div className="card stack gap-sm">
                <p className="muted strong">Theme</p>
                <div className="row-inline theme-buttons">
                  <Button label="Light" variant={theme === "light" ? "secondary" : "ghost"} onClick={() => setTheme("light")} />
                  <Button label="System" variant={theme === "system" ? "secondary" : "ghost"} onClick={() => setTheme("system")} />
                  <Button label="Dark" variant={theme === "dark" ? "secondary" : "ghost"} onClick={() => setTheme("dark")} />
                </div>
              </div>

              <div className="card stack gap-sm">
                <p className="muted strong">Plan</p>
                <div className="info-row">
                  <div>
                    <span className="muted small">Current plan</span>
                    <strong>Pro</strong>
                  </div>
                  <div>
                    <span className="muted small">Seats</span>
                    <strong>10</strong>
                  </div>
                  <div>
                    <span className="muted small">Billing</span>
                    <strong>Monthly</strong>
                  </div>
                </div>
              </div>

              <div className="card stack gap-sm">
                <p className="muted strong">Support</p>
                <p className="muted small">Need help? Contact us and we’ll get back to you.</p>
                <div className="row-inline">
                  <Button label="Open ticket" variant="secondary" />
                  <Button label="Chat" variant="ghost" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${effectiveTheme === "dark" ? "dark" : ""}`}>
          <div className="sidebar__top">
            <div className="sidebar__logo">
              <div className="logo-full">
                <img src="/assets/Icons_and_logos_4x/black_logo.png" alt="MizCall logo light" className="logo-light" />
                <img src="/assets/Icons_and_logos_4x/white_logo.png" alt="MizCall logo dark" className="logo-dark" />
              </div>
              <img src="/assets/Icons_and_logos_4x/360.png" alt="MizCall logo" className="logo-collapsed" />
            </div>
            <button className="collapse-btn" onClick={() => setSidebarCollapsed((c) => !c)}>
              {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </button>
          </div>
          <nav className="sidebar__nav">
            {(
              [
                { key: "dashboard", icon: <FiHome />, label: "Dashboard" },
                { key: "recordings", icon: <FiMic />, label: "Recordings" },
                { key: "settings", icon: <FiSettings />, label: "Settings" },
              ] as { key: NavTab; icon: ReactNode; label: string }[]
            ).map((item) => (
              <button
                key={item.key}
                className={`nav-item ${tab === item.key ? "active" : ""}`}
                onClick={() => setTab(item.key)}
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar__footer">
            <button className="btn btn-ghost full" onClick={doLogout}>
              <span className="nav-icon">
                <FiLogOut />
              </span>
              <span className="nav-label">Log out</span>
            </button>
          </div>
        </aside>
        <section className="main-pane">
          <div className="pane-header">
            <div className="stack gap-xxs">
              <p className="muted">MizCall Desktop</p>
              <h2 className="title">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h2>
            </div>
            <Pill>api: custom.mizcall.com</Pill>
          </div>
          <div className="content">{renderContent()}</div>
        </section>
      </div>
    );
  };

  return (
    <div className="app">
      <main className={`main ${session ? "main-app" : "main-auth"}`}>
        {session ? (
          renderAppShell()
        ) : (
          <>
            {screen === "login" && (
              <Login
                goRegister={() => setScreen("register")}
                onBack={() => setScreen("login")}
                onSubmit={doLogin}
                loading={loading}
                error={error}
              />
            )}
            {screen === "register" && (
              <Register
                goLogin={() => setScreen("login")}
                onBack={() => setScreen("login")}
              />
            )}
          </>
        )}
      </main>
      {toast ? (
        <div className={`toast toast-${toast.kind}`}>
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

export default App;

