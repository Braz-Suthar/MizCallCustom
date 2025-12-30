  const handleOtpDigitChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>
  ) => {
    const v = value.replace(/\D/g, "").slice(0, 1);
    setter((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    if (v && refs.current[index + 1]) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>
  ) => {
    if (e.key === "Backspace" && !values[index] && refs.current[index - 1]) {
      setter((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
      refs.current[index - 1]?.focus();
    }
  };
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  FiHome,
  FiMic,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiPhoneCall,
  FiPlus,
  FiMoreVertical,
  FiVolumeX,
  FiVolume2,
} from "react-icons/fi";

const API_BASE = "https://custom.mizcall.com";

type Screen = "login" | "register";
type Mode = "host" | "user";
type NavTab = "dashboard" | "users" | "calls" | "recordings" | "settings" | "call-active";

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
      <div className="auth-right">
        <div className="auth-hero">
          <h2 className="title auth-title">Welcome back to mizcall</h2>
          <p className="muted">
            Connect with your team and clients through high-quality video calls.
            Experience seamless communication with our advanced features.
          </p>
          <ul className="hero-list">
            <li><span className="tick">✓</span> High-quality video and audio</li>
            <li><span className="tick">✓</span> Screen sharing and collaboration</li>
            <li><span className="tick">✓</span> Secure and reliable connection</li>
          </ul>
        </div>
      </div>
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
        <div className="auth-right">
          <div className="auth-hero">
            <h2 className="title auth-title">Start your journey with MizCall</h2>
            <p className="muted">
              Join thousands of businesses that trust MizCall for their video communication needs. Get started with our easy setup process.
            </p>
            <ul className="hero-list">
              <li><span className="tick">✓</span> Easy team management</li>
              <li><span className="tick">✓</span> Flexible pricing plans</li>
              <li><span className="tick">✓</span> Dedicated support</li>
            </ul>
          </div>
        </div>
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
      <div className="auth-right">
        <div className="auth-hero">
          <h2 className="title auth-title">Start your journey with MizCall</h2>
          <p className="muted">
            Join thousands of businesses that trust MizCall for their video communication needs.
            Get started with our easy setup process.
          </p>
          <ul className="hero-list">
            <li><span className="tick">✓</span> Easy team management</li>
            <li><span className="tick">✓</span> Flexible pricing plans</li>
            <li><span className="tick">✓</span> Dedicated support</li>
          </ul>
        </div>
      </div>
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
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [systemPref, setSystemPref] = useState<"light" | "dark">("light");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "info" | "success" | "error" } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; time: string }>>([
    { id: "n1", message: "New user onboarded: U123456", time: "Today · 1:00 PM" },
    { id: "n2", message: "Recording available: main-room", time: "Today · 1:10 PM" },
    { id: "n3", message: "Network status: Excellent", time: "Today · 1:15 PM" },
    { id: "n4", message: "Host H844495 started a call", time: "Today · 1:20 PM" },
  ]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifText, setNotifText] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; username: string; enabled: boolean; password?: string | null }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUser, setEditUser] = useState<{ id: string; username: string; enabled: boolean; password?: string | null } | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [showViewUser, setShowViewUser] = useState(false);
  const [viewUser, setViewUser] = useState<{ id: string; username: string; enabled: boolean; password?: string | null } | null>(null);
  const [calls, setCalls] = useState<Array<{ id: string; status: string; started_at: string; ended_at: string | null }>>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [startCallLoading, setStartCallLoading] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [pwOtp, setPwOtp] = useState("");
  const [pwOtpDigits, setPwOtpDigits] = useState(["", "", "", "", "", ""]);
  const pwOtpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [emailOtpDigits, setEmailOtpDigits] = useState(["", "", "", "", "", ""]);
  const emailOtpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [activeCall, setActiveCall] = useState<{ id: string; started_at: string } | null>(null);
  const [activeParticipants, setActiveParticipants] = useState<
    Array<{
      id: string;
      name: string;
      role: "Host" | "User";
      status: "connected" | "connecting";
      muted: boolean;
      speaking: boolean;
      avatarUrl?: string;
    }>
  >([]);
  const [callMuted, setCallMuted] = useState(false);
  const [callVolume, setCallVolume] = useState(70);
  const activeCallListenerRef = useRef<null | (() => void)>(null);

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

  const fetchUsers = async () => {
    if (!session?.token || session.role !== "host") return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(`${API_BASE}/host/users`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      setUsers(
        (data.users ?? []).map((u: any) => ({
          id: u.id,
          username: u.username,
          enabled: u.enabled,
          password: null,
        }))
      );
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!session?.token) return;
    try {
      const res = await fetch(`${API_BASE}/host/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("User deleted", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleCreateUser = async () => {
    if (!session?.token || session.role !== "host") return;
    if (!createUsername.trim()) {
      showToast("Username required", "error");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/host/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      setUsers((prev) => [
        ...prev,
        {
          id: data.userId,
          username: createUsername.trim(),
          enabled: true,
          password: data.password ?? (createPassword.trim() || null),
        },
      ]);
      showToast(`User created (ID ${data.userId})`, "success");
      setCreateUsername("");
      setCreatePassword("");
      setShowCreateUser(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Create failed", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!session?.token || session.role !== "host" || !editUser) return;
    try {
      const res = await fetch(`${API_BASE}/host/users/${editUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          enabled: editEnabled,
          password: editPassword.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id ? { ...u, enabled: editEnabled, password: editPassword.trim() || u.password || null } : u
        )
      );
      showToast("User updated", "success");
      setShowEditUser(false);
      setEditUser(null);
      setEditPassword("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const fetchCalls = async () => {
    if (!session?.token || session.role !== "host") return;
    setCallsLoading(true);
    setCallsError(null);
    try {
      const res = await fetch(`${API_BASE}/host/calls`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      setCalls(data.calls ?? []);
    } catch (e) {
      setCallsError(e instanceof Error ? e.message : "Failed to load calls");
    } finally {
      setCallsLoading(false);
    }
  };

  const startCall = async () => {
    if (!session?.token || session.role !== "host") return;
    setStartCallLoading(true);
    try {
      const res = await fetch(`${API_BASE}/host/calls/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      const now = new Date().toISOString();
      setCalls((prev) => [{ id: data.roomId, status: "started", started_at: now, ended_at: null }, ...prev]);
      setActiveCall({ id: data.roomId, started_at: now });
      const seededParticipants = [
        {
          id: "U123456",
          name: "Alice Lee",
          role: "User" as const,
          status: "connected" as const,
          muted: false,
          speaking: true,
          avatarUrl: "https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=Alice+Lee",
        },
        {
          id: "U987654",
          name: "Bob Patel",
          role: "User" as const,
          status: "connected" as const,
          muted: true,
          speaking: false,
          avatarUrl: "https://ui-avatars.com/api/?background=F97316&color=fff&name=Bob+Patel",
        },
        {
          id: "U555000",
          name: "Charlie Zhang",
          role: "User" as const,
          status: "connecting" as const,
          muted: false,
          speaking: false,
          avatarUrl: "https://ui-avatars.com/api/?background=7C3AED&color=fff&name=Charlie+Zhang",
        },
        {
          id: "U332211",
          name: "Dana Smith",
          role: "User" as const,
          status: "connected" as const,
          muted: false,
          speaking: false,
          avatarUrl: "https://ui-avatars.com/api/?background=10B981&color=fff&name=Dana+Smith",
        },
        {
          id: "U778899",
          name: "Evan Torres",
          role: "User" as const,
          status: "connected" as const,
          muted: true,
          speaking: false,
          avatarUrl: "https://ui-avatars.com/api/?background=F59E0B&color=fff&name=Evan+Torres",
        },
        {
          id: "U445566",
          name: "Farah Khan",
          role: "User" as const,
          status: "connecting" as const,
          muted: false,
          speaking: false,
          avatarUrl: "https://ui-avatars.com/api/?background=6366F1&color=fff&name=Farah+Khan",
        },
        {
          id: "U889900",
          name: "Gabe Young",
          role: "User" as const,
          status: "connected" as const,
          muted: false,
          speaking: true,
          avatarUrl: "https://ui-avatars.com/api/?background=EC4899&color=fff&name=Gabe+Young",
        },
      ];
      setActiveParticipants(seededParticipants);
      if (window.mizcall?.openActiveCallWindow) {
        const payload = {
          session,
          call: { id: data.roomId, started_at: now },
          participants: seededParticipants,
        };
        window.mizcall.openActiveCallWindow(payload);
        setTab("calls"); // keep main window on calls; new window handles active call
      } else {
        setTab("call-active");
      }
      showToast(`Call started (${data.roomId})`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Start call failed", "error");
    } finally {
      setStartCallLoading(false);
    }
  };

  const endCall = async (id: string) => {
    if (!session?.token || session.role !== "host") return;
    try {
      const res = await fetch(`${API_BASE}/host/calls/${id}/end`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error(`End call failed (${res.status})`);
      const now = new Date().toISOString();
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "ended", ended_at: now } : c)));
      setActiveCall(null);
      setActiveParticipants([]);
      setTab("calls");
      showToast("Call ended", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "End call failed", "error");
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

  const toggleMuteParticipant = (id: string) => {
    setActiveParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, muted: !p.muted, speaking: p.muted ? p.speaking : false } : p))
    );
  };

  const kickParticipant = (id: string) => {
    setActiveParticipants((prev) => prev.filter((p) => p.id !== id));
    showToast(`Removed ${id}`, "success");
  };

  const disableParticipant = (id: string) => {
    setActiveParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "connecting", muted: true, speaking: false } : p))
    );
    showToast(`Disabled ${id}`, "success");
  };

  const sendEmailOtp = () => {
    if (!emailCurrentPassword.trim()) {
      showToast("Enter current password", "error");
      return;
    }
    if (session?.password && emailCurrentPassword !== session.password) {
      showToast("Current password incorrect", "error");
      return;
    }
    if (!newEmail.trim() || !newEmail.includes("@")) {
      showToast("Enter a valid email", "error");
      return;
    }
    const code = generateOtp();
    setEmailOtp(code);
    setEmailOtpSent(true);
    setEmailOtpDigits(["", "", "", "", "", ""]);
    showToast("OTP sent to email (demo)", "success");
  };

  const verifyEmailOtp = () => {
    if (!emailOtpSent) {
      showToast("Send OTP first", "error");
      return;
    }
    const inputCode = emailOtpDigits.join("");
    if (inputCode.trim() !== emailOtp) {
      showToast("Invalid OTP", "error");
      return;
    }
    setSession((prev) => (prev ? { ...prev, name: newEmail } : prev));
    showToast("Email updated (client only)", "success");
    setShowChangeEmail(false);
    setNewEmail("");
    setEmailOtp("");
    setEmailOtpDigits(["", "", "", "", "", ""]);
    setEmailOtpSent(false);
    setEmailCurrentPassword("");
  };

  const sendPwOtp = () => {
    if (!newPasswordValue.trim() || newPasswordValue.length < 4) {
      showToast("Enter a new password (min 4 chars)", "error");
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      showToast("Passwords do not match", "error");
      return;
    }
    const code = generateOtp();
    setPwOtp(code);
    setPwOtpSent(true);
    setPwOtpDigits(["", "", "", "", "", ""]);
    showToast("OTP sent (demo)", "success");
  };

  const verifyPwOtp = () => {
    if (!pwOtpSent) {
      showToast("Send OTP first", "error");
      return;
    }
    const inputCode = pwOtpDigits.join("");
    if (inputCode.trim() !== pwOtp) {
      showToast("Invalid OTP", "error");
      return;
    }
    setSession((prev) => (prev ? { ...prev, password: newPasswordValue } : prev));
    showToast("Password updated (client only)", "success");
    setShowChangePassword(false);
    setNewPasswordValue("");
    setConfirmPasswordValue("");
    setPwOtp("");
    setPwOtpDigits(["", "", "", "", "", ""]);
    setPwOtpSent(false);
  };

  useEffect(() => {
    if (tab === "users" && session?.role === "host") {
      fetchUsers();
    }
    if (tab === "calls" && session?.role === "host") {
      fetchCalls();
    }

    if (!activeCallListenerRef.current && window.mizcall?.onActiveCallContext) {
      activeCallListenerRef.current = window.mizcall.onActiveCallContext((payload: any) => {
        if (payload?.session) {
          setSession(payload.session);
        }
        if (payload?.call) {
          setActiveCall(payload.call);
        }
        if (payload?.participants) {
          setActiveParticipants(payload.participants);
        }
        setTab("call-active");
      });
    }

    return () => {
      if (activeCallListenerRef.current) {
        activeCallListenerRef.current();
        activeCallListenerRef.current = null;
      }
    };
  }, [tab, session?.token, session?.role]);

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

    const renderActiveCall = () => {
      if (session.role !== "host") {
        return (
          <div className="card stack gap-sm">
            <p className="muted strong">Active Call</p>
            <p className="muted">Only hosts can view active calls.</p>
          </div>
        );
      }
      if (!activeCall) {
        return (
          <div className="card stack gap-sm">
            <p className="muted strong">Active Call</p>
            <p className="muted">No active call. Start a call from Dashboard or Calls.</p>
          </div>
        );
      }
      return (
        <div className="stack gap-sm">
          <div className="card stack gap-sm">
            <div className="row-inline between">
              <div className="stack gap-xxs">
                <p className="muted strong">Active Call</p>
                <p className="muted small">Call ID: {activeCall.id}</p>
                <p className="muted small">Started: {formatDateTime(activeCall.started_at)}</p>
              </div>
              <div className="row-inline gap-sm">
                <Button label="Copy ID" variant="ghost" onClick={() => copyToClipboard(activeCall.id)} />
                <Button label="End Call" variant="danger" onClick={() => endCall(activeCall.id)} />
              </div>
            </div>
          </div>

          <div className="card stack gap-sm">
            <div className="row-inline between">
              <p className="muted strong">Participants</p>
              <Button label="Refresh" variant="ghost" onClick={() => showToast("Refresh participants (stub)", "info")} />
            </div>
            <div className="participants-grid">
              {activeParticipants.filter((p) => p.role === "User").map((p) => (
                <div key={p.id} className="participant-card">
                  <div className="participant-header">
                    <div className="avatar-sm">
                      {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} /> : (p.name || "U")[0]}
                    </div>
                    <div className="stack gap-xxs">
                      <strong>{p.name}</strong>
                    </div>
                    <button className="icon-btn" onClick={() => showToast("More actions (stub)", "info")} title="More">
                      <FiMoreVertical />
                    </button>
                  </div>
                  <div className="participant-meta" />
                  <div className="participant-actions">
                    <button className="icon-btn" onClick={() => toggleMuteParticipant(p.id)} title={p.muted ? "Unmute" : "Mute"}>
                      {p.muted ? <FiVolumeX /> : <FiVolume2 />}
                    </button>
                  </div>
                  <div className="participant-status">
                    {p.muted ? <span className="muted small">Muted</span> : <span className="muted small">Speaking</span>}
                  </div>
                </div>
              ))}
              {activeParticipants.length === 0 ? (
                <div className="card subtle">
                  <p className="muted small">No participants yet.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card call-footer">
            <button
              className="icon-btn"
              onClick={() => showToast("Open audio settings (stub)", "info")}
              title="Audio settings"
            >
              <FiSettings />
            </button>
            <button
              className={`mute-btn ${callMuted ? "muted" : "unmuted"}`}
              onClick={() => setCallMuted((m) => !m)}
            >
              {callMuted ? <FiVolumeX /> : <FiVolume2 />}
              <span>{callMuted ? "Unmute" : "Mute"}</span>
            </button>
            <div className="volume-control">
              <span className="muted small">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={callVolume}
                onChange={(e) => setCallVolume(Number(e.target.value))}
              />
              <span className="muted small">{callVolume}%</span>
            </div>
          </div>
        </div>
      );
    };

    const renderContent = () => {
      if (tab === "dashboard") {
        return (
          <div className="stack gap-sm">
            {session.role === "host" ? (
              <div className="card row gap-sm quick-actions">
                <div className="muted strong">Quick Actions</div>
                <div className="actions-grid">
                  <Button label="Start New Call" variant="primary" onClick={startCall} loading={startCallLoading} />
                  <Button label="Create New User" variant="primary" />
                </div>
              </div>
            ) : null}
            <div className="stats-grid">
              <div className="card stat-card">
                <p className="muted strong">Total Users</p>
                <h3 className="stat-number">120</h3>
              </div>
              <div className="card stat-card">
                <p className="muted strong">Active Users</p>
                <h3 className="stat-number">18</h3>
              </div>
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
                <div className="row-inline between">
                  <p className="muted strong">Notifications</p>
                  {session.role === "host" ? (
                    <Button label="Add notification" variant="secondary" onClick={() => setShowNotifModal(true)} />
                  ) : null}
                </div>
                <div className="activity-list">
                  {notifications.map((n) => (
                    <div key={n.id} className="activity-item">
                      <span className="activity-icon">🔔</span>
                      <div className="stack gap-xxs">
                        <strong>{n.message}</strong>
                        <span className="muted small">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (tab === "users") {
        return (
          <>
            {session.role !== "host" ? (
              <div className="card stack gap-sm">
                <p className="muted strong">Users</p>
                <p className="muted">Only hosts can manage users.</p>
              </div>
            ) : (
              <div className="card stack gap-sm">
                <div className="row-inline between">
                  <div />
                  <button className="btn btn-primary btn-no-shadow btn-with-icon" onClick={() => setShowCreateUser(true)}>
                    <FiPlus />
                    <span>Create New User</span>
                  </button>
                </div>
                {usersError ? <p className="error">{usersError}</p> : null}
                {usersLoading ? <p className="muted">Loading users…</p> : null}
                <div className="table">
                  <div className="table-row table-head">
                    <div>User ID</div>
                    <div>Username</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>
                  {users.map((u) => (
                    <div key={u.id} className="table-row">
                      <div>{u.id}</div>
                      <div>{u.username}</div>
                      <div>
                        <span className={u.enabled ? "status-enabled" : "status-disabled"}>
                          {u.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="row-inline">
                        <Button
                          label="View"
                          variant="ghost"
                          onClick={() => {
                            setViewUser(u);
                            setShowViewUser(true);
                          }}
                        />
                        <Button
                          label="Edit"
                          variant="secondary"
                          onClick={() => {
                            setEditUser(u);
                            setEditEnabled(u.enabled);
                          setEditPassword("");
                            setShowEditUser(true);
                          }}
                        />
                        <Button label="Delete" variant="danger" onClick={() => handleDeleteUser(u.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }

      if (tab === "calls") {
        return (
          <>
            {session.role !== "host" ? (
              <div className="card stack gap-sm">
                <p className="muted strong">Calls</p>
                <p className="muted">Only hosts can manage calls.</p>
              </div>
            ) : (
              <div className="card stack gap-sm">
                <div className="stack gap-sm">
                  <div className="row-inline between">
                    <p className="muted strong">Host Call</p>
                    <button className="btn btn-primary btn-no-shadow btn-with-icon" onClick={startCall} disabled={startCallLoading}>
                      <FiPhoneCall />
                      <span>{startCallLoading ? "Starting..." : "Start New Call"}</span>
                    </button>
                  </div>
                  {(() => {
                    const active = calls.find((c) => c.status !== "ended");
                    if (!active) {
                      return <p className="muted small">No active calls. Start a new call to begin hosting.</p>;
                    }
                    return (
                      <div className="card subtle stack gap-xxs">
                        <div className="row-inline between">
                          <div className="stack gap-xxs">
                            <p className="muted strong">Current Call</p>
                            <p className="muted small">ID: {active.id}</p>
                            <p className="muted small">Started: {formatDateTime(active.started_at)}</p>
                          </div>
                          <div className="row-inline gap-sm">
                            <Button variant="ghost" label="Copy ID" onClick={() => copyToClipboard(active.id)} />
                            <Button variant="danger" label="End Call" onClick={() => endCall(active.id)} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {callsError ? <p className="error">{callsError}</p> : null}
                {callsLoading ? <p className="muted">Loading calls…</p> : null}
                <div className="table">
                  <div className="table-row table-head">
                    <div>Call ID</div>
                    <div>Status</div>
                    <div>Started at</div>
                    <div>Ended at</div>
                    <div>Actions</div>
                  </div>
                  {calls.map((c) => (
                    <div key={c.id} className="table-row">
                      <div>{c.id}</div>
                      <div>
                        <span className={c.status === "started" ? "status-enabled" : "status-disabled"}>
                          {c.status}
                        </span>
                      </div>
                      <div>{formatDateTime(c.started_at)}</div>
                      <div>{formatDateTime(c.ended_at)}</div>
                      <div className="row-inline">
                        {c.status !== "ended" ? (
                          <Button label="End" variant="danger" onClick={() => endCall(c.id)} />
                        ) : (
                          <span className="muted small">Completed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }

      if (tab === "call-active") {
        return renderActiveCall();
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
                <p className="muted strong">Security</p>
                <div className="row-inline">
                  <Button label="Change Email" variant="secondary" onClick={() => setShowChangeEmail(true)} />
                  <Button label="Change Password" variant="ghost" onClick={() => setShowChangePassword(true)} />
                </div>
                <p className="muted small">Both steps require OTP verification.</p>
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

    if (tab === "call-active") {
      return (
        <div className="main-pane call-active-standalone">
          <div className="content">{renderActiveCall()}</div>
        </div>
      );
    }

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
            {(() => {
              const base: Array<{ key: NavTab; icon: ReactNode; label: string }> =
                session.role === "host"
                  ? [
                      { key: "dashboard", icon: <FiHome />, label: "Dashboard" },
                      { key: "users", icon: <FiUsers />, label: "Users" },
                      { key: "calls", icon: <FiPhoneCall />, label: "Calls" },
                      { key: "recordings", icon: <FiMic />, label: "Recordings" },
                      { key: "settings", icon: <FiSettings />, label: "Settings" },
                    ]
                  : [
                      { key: "dashboard", icon: <FiHome />, label: "Dashboard" },
                      { key: "recordings", icon: <FiMic />, label: "Recordings" },
                      { key: "settings", icon: <FiSettings />, label: "Settings" },
                    ];
              return base.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${tab === item.key ? "active" : ""}`}
                  onClick={() => setTab(item.key)}
                  title={item.label}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ));
            })()}
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
      {showNotifModal ? (
        <div className="modal-backdrop" onClick={() => setShowNotifModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="title-sm">Add notification</h3>
            <textarea
              className="modal-textarea"
              value={notifText}
              onChange={(e) => setNotifText(e.target.value)}
              placeholder="Type notification message"
              rows={3}
            />
            <div className="modal-actions">
              <Button label="Cancel" variant="ghost" onClick={() => { setShowNotifModal(false); setNotifText(""); }} />
              <Button
                label="Add"
                disabled={!notifText.trim()}
                onClick={() => {
                  setNotifications((prev) => [
                    { id: `n-${Date.now()}`, message: notifText.trim(), time: "Just now" },
                    ...prev,
                  ]);
                  setNotifText("");
                  setShowNotifModal(false);
                  showToast("Notification added", "success");
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Create User Modal */}
      {showCreateUser ? (
        <div className="modal-backdrop" onClick={() => setShowCreateUser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Create New User</p>
            </div>
            <div className="modal-body stack gap-sm">
              <Input label="Username" value={createUsername} onChange={setCreateUsername} placeholder="username" />
              <Input label="Password (optional)" value={createPassword} onChange={setCreatePassword} placeholder="auto-generate if empty" />
            </div>
            <div className="modal-actions">
              <Button label="Cancel" variant="ghost" onClick={() => setShowCreateUser(false)} />
              <Button label="Create" onClick={handleCreateUser} loading={createLoading} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit User Modal */}
      {showEditUser && editUser ? (
        <div className="modal-backdrop" onClick={() => setShowEditUser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Edit User</p>
            </div>
            <div className="modal-body stack gap-sm">
              <p className="muted small">User ID: {editUser.id}</p>
              <p className="muted small">Username: {editUser.username}</p>
              <div className="inline-field switch-field">
                <span>Enabled</span>
                <label className="switch">
                  <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <Input
                label="New Password (optional)"
                value={editPassword}
                onChange={setEditPassword}
                placeholder="Leave blank to keep current password"
              />
              <button
                className="linklike small"
                onClick={() => setEditPassword(Math.random().toString(36).slice(2, 10))}
              >
                Generate new random password
              </button>
            </div>
            <div className="modal-actions">
              <Button label="Cancel" variant="ghost" onClick={() => setShowEditUser(false)} />
              <Button label="Save" onClick={handleEditUser} />
            </div>
          </div>
        </div>
      ) : null}

      {/* View User Modal */}
      {showViewUser && viewUser ? (
        <div className="modal-backdrop" onClick={() => setShowViewUser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">User Details</p>
            </div>
            <div className="modal-body stack gap-sm">
              <p className="muted small"><strong>Username:</strong> {viewUser.username}</p>
              <p className="muted small">
                <strong>Status:</strong>{" "}
                <span className={viewUser.enabled ? "status-enabled" : "status-disabled"}>
                  {viewUser.enabled ? "Enabled" : "Disabled"}
                </span>
              </p>
              <div className="row-inline gap-sm align-center">
                <p className="muted small"><strong>Password:</strong> {viewUser.password || "Not available"}</p>
                <button
                  className="linklike"
                  onClick={() => viewUser.password && copyToClipboard(viewUser.password)}
                  disabled={!viewUser.password}
                >
                  Copy password
                </button>
              </div>
              <div className="row-inline gap-sm align-center">
                <p className="muted small"><strong>User ID:</strong> {viewUser.id}</p>
                <button className="linklike" onClick={() => copyToClipboard(viewUser.id)}>
                  Copy ID
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <Button label="Close" variant="ghost" onClick={() => setShowViewUser(false)} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Change Email Modal */}
      {showChangeEmail ? (
        <div className="modal-backdrop" onClick={() => setShowChangeEmail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Change Email</p>
            </div>
            <div className="modal-body stack gap-sm">
              <Input label="Current Password" type="password" value={emailCurrentPassword} onChange={setEmailCurrentPassword} placeholder="Enter current password" />
              <Input label="New Email" value={newEmail} onChange={setNewEmail} placeholder="you@example.com" />
              {!emailOtpSent ? (
                <Button label="Send OTP" variant="secondary" onClick={sendEmailOtp} />
              ) : (
                <div className="stack gap-xxs">
                  <div className="otp-row">
                    {emailOtpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          emailOtpRefs.current[i] = el;
                        }}
                        className="otp-input"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value, setEmailOtpDigits, emailOtpRefs)}
                        onKeyDown={(e) => handleOtpKeyDown(e, i, emailOtpDigits, setEmailOtpDigits, emailOtpRefs)}
                      />
                    ))}
                  </div>
                  <button className="linklike small" onClick={sendEmailOtp}>Resend OTP</button>
                </div>
              )}
              <p className="muted small">An OTP is required to confirm your email change.</p>
            </div>
            <div className="modal-actions">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  setShowChangeEmail(false);
                  setNewEmail("");
                  setEmailOtp("");
                  setEmailOtpDigits(["", "", "", "", "", ""]);
                  setEmailOtpSent(false);
                  setEmailCurrentPassword("");
                }}
              />
              <Button label="Verify & Save" onClick={verifyEmailOtp} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Change Password Modal */}
      {showChangePassword ? (
        <div className="modal-backdrop" onClick={() => setShowChangePassword(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Change Password</p>
            </div>
            <div className="modal-body stack gap-sm">
              <Input label="New Password" type="password" value={newPasswordValue} onChange={setNewPasswordValue} placeholder="Enter new password" />
              <Input label="Confirm Password" type="password" value={confirmPasswordValue} onChange={setConfirmPasswordValue} placeholder="Confirm new password" />
              {!pwOtpSent ? (
                <Button label="Send OTP" variant="secondary" onClick={sendPwOtp} />
              ) : (
                <div className="stack gap-xxs">
                  <div className="otp-row">
                    {pwOtpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          pwOtpRefs.current[i] = el;
                        }}
                        className="otp-input"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value, setPwOtpDigits, pwOtpRefs)}
                        onKeyDown={(e) => handleOtpKeyDown(e, i, pwOtpDigits, setPwOtpDigits, pwOtpRefs)}
                      />
                    ))}
                  </div>
                  <button className="linklike small" onClick={sendPwOtp}>Resend OTP</button>
                </div>
              )}
              <p className="muted small">We require OTP verification to update your password.</p>
            </div>
            <div className="modal-actions">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPasswordValue("");
                  setConfirmPasswordValue("");
                  setPwOtp("");
                  setPwOtpDigits(["", "", "", "", "", ""]);
                  setPwOtpSent(false);
                }}
              />
              <Button label="Verify & Save" onClick={verifyPwOtp} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

