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
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
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
  FiX,
  FiMoreVertical,
  FiVolumeX,
  FiVolume2,
  FiSun,
  FiMoon,
  FiWifi,
  FiWifiOff,
  FiCalendar,
  FiSmartphone,
  FiPlay,
  FiPause,
  FiTrash,
} from "react-icons/fi";
import {
  IoStar,
  IoPersonCircleOutline,
  IoColorPaletteOutline,
  IoShieldCheckmarkOutline,
  IoNotificationsOutline,
  IoLockClosedOutline,
  IoLogOutOutline,
  IoInformationCircleOutline,
  IoLogoAndroid,
  IoLogoApple,
  IoLogoWindows,
  IoDesktopOutline,
} from "react-icons/io5";
import iconHome from "../assets/ui_icons/home.svg";
import iconUsers from "../assets/ui_icons/users.svg";
import iconCalls from "../assets/ui_icons/calls.svg";
import iconRecordings from "../assets/ui_icons/recordings.svg";
import iconSettings from "../assets/ui_icons/settings.svg";

const API_BASE = "https://custom.mizcall.com";
const DEVICE_LABEL = "Desktop";
const logoWhite = new URL("../assets/Icons_and_logos_4x/white_logo.png", import.meta.url).href;
const logoBlack = new URL("../assets/Icons_and_logos_4x/black_logo.png", import.meta.url).href;
const logo360 = new URL("../assets/Icons_and_logos_4x/360.png", import.meta.url).href;
const platformIconAndroid = new URL("../assets/ui_icons/android.png", import.meta.url).href;
const platformIconApple = new URL("../assets/ui_icons/apple.png", import.meta.url).href;
const platformIconLinux = new URL("../assets/ui_icons/linux.png", import.meta.url).href;
const platformIconUbuntu = new URL("../assets/ui_icons/ubuntu.png", import.meta.url).href;
const platformIconMenu = new URL("../assets/ui_icons/menu.png", import.meta.url).href;

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
  icon,
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) => (
  <button
    className={`btn btn-${variant}`}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? "…" : (
      <span className="btn-content">
        {icon ? <span className="btn-icon">{icon}</span> : null}
        <span>{label}</span>
      </span>
    )}
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

const ToggleSwitch = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
  <label className="switch">
    <input type="checkbox" checked={checked} onChange={onToggle} />
    <span className="slider" />
  </label>
);

const Login = ({
  goRegister,
  onBack,
  onSubmit,
  loading,
  error,
  onForgot,
}: {
  goRegister: () => void;
  onBack: () => void;
  onSubmit: (payload: { identifier: string; password: string }) => void;
  loading: boolean;
  error: string | null;
  onForgot: () => void;
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
          <img src={logoWhite} alt="MizCall" className="logo-img" />
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
            <button className="linklike" onClick={onForgot}>Forgot your password?</button>
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
            <img src={logoWhite} alt="MizCall" className="logo-img" />
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
          <img src={logoWhite} alt="MizCall" className="logo-img" />
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
    refreshToken?: string;
    sessionId?: string | null;
    accessJti?: string | null;
    hostId?: string;
    userId?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    password?: string;
    twoFactorEnabled?: boolean;
    allowMultipleSessions?: boolean;
  } | null>(null);
  const [tab, setTab] = useState<NavTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [systemPref, setSystemPref] = useState<"light" | "dark">("light");
  const [hostOtpPending, setHostOtpPending] = useState<{ hostId: string; email?: string; password: string } | null>(null);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpError, setLoginOtpError] = useState<string | null>(null);
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const [loginOtpResendTimer, setLoginOtpResendTimer] = useState(0);
  const [forgotStep, setForgotStep] = useState<"none" | "request" | "reset">("none");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotHostId, setForgotHostId] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [deviceLockEnabled, setDeviceLockEnabled] = useState(false);
  const [oneDeviceOnly, setOneDeviceOnly] = useState(false);
  const [allowMultipleSessions, setAllowMultipleSessions] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showDeviceLockPrompt, setShowDeviceLockPrompt] = useState(false);
  const [deviceLockPassword, setDeviceLockPassword] = useState("");
  const [deviceLockError, setDeviceLockError] = useState<string | null>(null);
  const [showDeviceLockAuth, setShowDeviceLockAuth] = useState(false);
  const [deviceLockAuthPassword, setDeviceLockAuthPassword] = useState("");
  const [biometricSupport, setBiometricSupport] = useState<{ available: boolean; type: string } | null>(null);
  const [sessionsVisible, setSessionsVisible] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      deviceLabel?: string | null;
      deviceName?: string | null;
      modelName?: string | null;
      platform?: string | null;
      userAgent?: string | null;
      createdAt?: string;
      lastSeenAt?: string;
      isCurrent?: boolean;
    }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifText, setNotifText] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; username: string; enabled: boolean; password?: string | null; enforce_single_device?: boolean | null }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createEnforceSingleDevice, setCreateEnforceSingleDevice] = useState<boolean | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUser, setEditUser] = useState<{ id: string; username: string; enabled: boolean; password?: string | null; enforce_single_device?: boolean | null } | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editEnforceSingleDevice, setEditEnforceSingleDevice] = useState<boolean | null>(null);
  const [showViewUser, setShowViewUser] = useState(false);
  const [viewUser, setViewUser] = useState<{ id: string; username: string; enabled: boolean; password?: string | null } | null>(null);
  const [showUserSessions, setShowUserSessions] = useState(false);
  const [userSessions, setUserSessions] = useState<Array<{ id: string; deviceLabel?: string; deviceName?: string; platform?: string; createdAt?: string; lastSeenAt?: string }>>([]);
  const [userSessionRequests, setUserSessionRequests] = useState<Array<{ id: string; deviceLabel: string; platform?: string; requestedAt: string }>>([]);
  const [userSessionsLoading, setUserSessionsLoading] = useState(false);
  const [calls, setCalls] = useState<Array<{ id: string; status: string; started_at: string; ended_at: string | null }>>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [startCallLoading, setStartCallLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [recordings, setRecordings] = useState<
    Array<{
      userName: string;
      dates: { date: string; recordings: Array<{ id: string; time: string }> }[];
    }>
  >([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [recordingsError, setRecordingsError] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [activeCall, setActiveCall] = useState<{ id: string; started_at: string; routerRtpCapabilities?: any } | null>(null);
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
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [callJoinState, setCallJoinState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("offline");
  const callSocketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const producerRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const hostProducerIdRef = useRef<string | null>(null);
  const routerCapsRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [pttActive, setPttActive] = useState(false);
  const pendingConsumeRef = useRef<Array<{ producerId: string; ownerId?: string }>>([]);
  const activeCallListenerRef = useRef<null | (() => void)>(null);
  const userWsRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check for biometric support
    const checkBiometrics = async () => {
      if (window.mizcall?.checkBiometricSupport) {
        const support = await window.mizcall.checkBiometricSupport();
        console.log("[Desktop] Biometric support:", support);
        setBiometricSupport(support);
      }
    };
    checkBiometrics();
    
    // Restore persisted theme and session
    try {
      const storedTheme = localStorage.getItem("mizcall.theme");
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setTheme(storedTheme);
      }
    } catch {
      // ignore
    }
    
    // Load device lock preference
    try {
      const lockEnabled = localStorage.getItem("mizcall.deviceLockEnabled");
      if (lockEnabled === "true") {
        setDeviceLockEnabled(true);
      }
    } catch {
      // ignore
    }
    
    try {
      const raw = localStorage.getItem("mizcall.session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.role) {
          // Check if device lock is enabled - if so, require authentication before restoring session
          const lockEnabled = localStorage.getItem("mizcall.deviceLockEnabled");
          if (lockEnabled === "true") {
            // Show device lock authentication prompt
            setSession(parsed); // Store session but don't show app yet
            setShowDeviceLockAuth(true);
            setScreen("login"); // Keep on login screen until authenticated
          } else {
            setSession(parsed);
            setScreen("login");
          }
        }
      }
    } catch {
      localStorage.removeItem("mizcall.session");
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    setSystemPref(mql.matches ? "dark" : "light");
    mql.addEventListener("change", listener);
    const onlineHandler = () => setNetworkStatus("online");
    const offlineHandler = () => setNetworkStatus("offline");
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      mql.removeEventListener("change", listener);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  const effectiveTheme = theme === "system" ? systemPref : theme;

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(effectiveTheme === "dark" ? "theme-dark" : "theme-light");
    try {
      localStorage.setItem("mizcall.theme", theme);
    } catch {
      // ignore
    }
  }, [effectiveTheme, theme]);

  useEffect(() => {
    // Log session changes for debugging
    console.log("[desktop] session state:", session);
  }, [session]);

  useEffect(() => {
    setTwoFactorEnabled(!!session?.twoFactorEnabled);
    setAllowMultipleSessions(session?.allowMultipleSessions ?? true);
  }, [session?.twoFactorEnabled, session?.allowMultipleSessions]);

  useEffect(() => {
    if (!hostOtpPending) {
      setLoginOtpResendTimer(0);
      setLoginOtpCode("");
      setLoginOtpError(null);
      setLoginOtpLoading(false);
      return;
    }
    setLoginOtpResendTimer((t) => (t === 0 ? 25 : t));
    const timer = setInterval(() => {
      setLoginOtpResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hostOtpPending]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem("mizcall.session", JSON.stringify(session));
      } else {
        localStorage.removeItem("mizcall.session");
      }
    } catch {
      // ignore
    }
  }, [session]);

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
        if ((data as any).requireOtp) {
          setHostOtpPending({ hostId: (data as any).hostId, email: (data as any).email, password: payload.password });
          setLoginOtpCode("");
          setLoginOtpError(null);
          setScreen("login");
          return;
        }
        setSession({
          role: "host",
          token: data.token,
          refreshToken: data.refreshToken,
          sessionId: (data as any).sessionId ?? null,
          accessJti: (data as any).accessJti ?? null,
          hostId: data.hostId,
          name: data.name ?? payload.identifier,
          avatarUrl: data.avatarUrl,
          password: payload.password,
          twoFactorEnabled: (data as any).twoFactorEnabled ?? false,
          allowMultipleSessions: (data as any).allowMultipleSessions ?? true,
        });
        setScreen("login");
      } else {
        const data = await window.mizcall?.loginUser?.(payload.identifier, payload.password);
        if (!data) throw new Error("Bridge unavailable");
        console.log("[desktop] user login response:", data);
        const userData = data as any;
        
        // Check if session approval is pending
        if (userData.pending) {
          setError(`Session approval pending. ${userData.message || ""}\n\nExisting device: ${userData.existingDevice || "Unknown"}\nPlatform: ${userData.existingPlatform || "Unknown"}`);
          showToast("Session approval pending. Please wait for host approval.", "info");
          setLoading(false);
          
          // Start polling for approval
          const pollInterval = setInterval(async () => {
            try {
              const retryData = await window.mizcall?.loginUser?.(payload.identifier, payload.password);
              if (retryData && !retryData.pending && retryData.token) {
                // Approved! Login successful
                clearInterval(pollInterval);
                setSession({
                  role: "user",
                  token: retryData.token,
                  refreshToken: retryData.refreshToken,
                  userId: retryData.userId ?? payload.identifier,
                  hostId: retryData.hostId,
                  name: retryData.name ?? payload.identifier,
                  avatarUrl: retryData.avatarUrl,
                  password: retryData.password ?? payload.password,
                  twoFactorEnabled: false,
                  allowMultipleSessions: true,
                });
                
                let message = "Session approved! You are now logged in.";
                if (retryData.revokedSessions && retryData.revokedSessions > 0) {
                  message += ` (Logged out from ${retryData.revokedSessions} other device(s))`;
                }
                showToast(message, "success");
                setError(null);
                setScreen("login");
              }
            } catch (e) {
              // Still pending or rejected - stop polling
              clearInterval(pollInterval);
              setError("Session request was rejected or expired");
              showToast("Session request was rejected by the host", "error");
            }
          }, 3000);
          
          // Stop polling after 5 minutes
          setTimeout(() => clearInterval(pollInterval), 300000);
          return;
        }
        
        setSession({
          role: "user",
          token: userData.token,
          refreshToken: userData.refreshToken,
          userId: userData.userId ?? payload.identifier,
          hostId: userData.hostId,
          name: userData.name ?? payload.identifier,
          avatarUrl: userData.avatarUrl,
          password: userData.password ?? payload.password,
          twoFactorEnabled: false,
          allowMultipleSessions: true,
        });
        
        // Show notification if old sessions were revoked
        if (userData.revokedSessions && userData.revokedSessions > 0) {
          showToast(`Logged in. You were logged out from ${userData.revokedSessions} other device(s).`, "info");
        }
        
        setScreen("login");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      const friendly =
        msg.includes("already signed in") || msg.includes("SESSION_ACTIVE")
          ? "You're already signed in on another device. Log out there or enable concurrent sessions."
          : msg;
      setError(friendly);
      showToast(friendly, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyHostLoginOtp = async () => {
    if (!hostOtpPending) return;
    if (!loginOtpCode.trim()) {
      setLoginOtpError("Enter the 6-digit code");
      return;
    }
    setLoginOtpLoading(true);
    setLoginOtpError(null);
    try {
      const data = await window.mizcall?.verifyHostOtp?.(hostOtpPending.hostId, loginOtpCode.trim());
      if (!data) throw new Error("Bridge unavailable");
      setSession({
        role: "host",
        token: (data as any).token,
        refreshToken: (data as any).refreshToken,
        sessionId: (data as any).sessionId ?? null,
        accessJti: (data as any).accessJti ?? null,
        hostId: (data as any).hostId,
        name: (data as any).name ?? hostOtpPending.hostId,
        avatarUrl: (data as any).avatarUrl,
        password: hostOtpPending.password,
        twoFactorEnabled: (data as any).twoFactorEnabled ?? true,
        email: (data as any).email ?? hostOtpPending.email,
        allowMultipleSessions: (data as any).allowMultipleSessions ?? true,
      });
      setHostOtpPending(null);
      setLoginOtpCode("");
      setLoginOtpResendTimer(0);
      setScreen("login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      const friendly =
        msg.includes("already signed in") || msg.includes("SESSION_ACTIVE")
          ? "You're already signed in on another device. Log out there or enable concurrent sessions."
          : msg;
      setLoginOtpError(friendly);
      showToast(friendly, "error");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  const resendHostLoginOtp = async () => {
    if (!hostOtpPending || loginOtpResendTimer > 0) return;
    try {
      setLoginOtpError(null);
      setLoginOtpLoading(true);
      const data = await window.mizcall?.loginHost?.(hostOtpPending.email || hostOtpPending.hostId, hostOtpPending.password);
      if (!data) throw new Error("Bridge unavailable");
      if (!(data as any).requireOtp) {
        // Received tokens directly; log user in
        setSession({
          role: "host",
          token: (data as any).token,
          refreshToken: (data as any).refreshToken,
          hostId: (data as any).hostId,
          name: (data as any).name ?? hostOtpPending.hostId,
          avatarUrl: (data as any).avatarUrl,
          password: hostOtpPending.password,
          twoFactorEnabled: (data as any).twoFactorEnabled ?? false,
          email: (data as any).email ?? hostOtpPending.email,
          allowMultipleSessions: (data as any).allowMultipleSessions ?? true,
        });
        setHostOtpPending(null);
        setLoginOtpCode("");
        setLoginOtpResendTimer(0);
        return;
      }
      setHostOtpPending({
        hostId: (data as any).hostId,
        email: (data as any).email ?? hostOtpPending.email,
        password: hostOtpPending.password,
      });
      setLoginOtpResendTimer(25);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Resend failed";
      const friendly =
        msg.includes("already signed in") || msg.includes("SESSION_ACTIVE")
          ? "You're already signed in on another device. Log out there or enable concurrent sessions."
          : msg;
      setLoginOtpError(friendly);
      showToast(friendly, "error");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  const handleForgotSendOtp = async () => {
    setForgotError(null);
    if (!forgotIdentifier.trim()) {
      setForgotError("Enter email or Host ID");
      return;
    }
    setForgotLoading(true);
    try {
      const data = await window.mizcall?.requestHostPasswordOtp?.(forgotIdentifier.trim());
      if (!data) throw new Error("Bridge unavailable");
      setForgotHostId((data as any).hostId || "");
      setForgotEmail((data as any).email || "");
      setForgotStep("reset");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      showToast("OTP sent", "success");
    } catch (e) {
      setForgotError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setForgotError(null);
    if (!forgotHostId.trim() || !forgotOtp.trim()) {
      setForgotError("Enter the code");
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.length < 6) {
      setForgotError("Password must be at least 6 characters");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }
    setForgotLoading(true);
    try {
      const ok = await window.mizcall?.resetHostPassword?.({
        hostId: forgotHostId.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      if (ok && (ok as any).ok) {
        showToast("Password reset. Please login.", "success");
        setForgotStep("none");
        setForgotIdentifier(forgotHostId);
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
      } else {
        throw new Error("Reset failed");
      }
    } catch (e) {
      setForgotError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  const doLogout = useCallback(async () => {
    // Call backend to clear active session
    if (session?.token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        // Ignore logout errors - still clear local state
        console.warn("[desktop] logout API call failed", e);
      }
    }
    setSession(null);
    setError(null);
    setScreen("login");
    setTab("dashboard");
    try {
      localStorage.removeItem("mizcall.session");
    } catch {
      // ignore
    }
  }, [session?.token]);

  const refreshAccessToken = useCallback(async () => {
    if (!session?.refreshToken) {
      throw new Error("No refresh token available");
    }
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      throw new Error(`Refresh failed (${res.status})`);
    }
    const data = await res.json();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            token: data.token,
            refreshToken: data.refreshToken ?? prev.refreshToken,
            sessionId: data.sessionId ?? prev.sessionId,
            accessJti: data.accessJti ?? prev.accessJti,
            name: data.name ?? prev.name,
            avatarUrl: data.avatarUrl ?? prev.avatarUrl,
            twoFactorEnabled: data.twoFactorEnabled ?? prev.twoFactorEnabled,
            allowMultipleSessions: data.allowMultipleSessions ?? prev.allowMultipleSessions ?? true,
          }
        : prev
    );
    return data.token as string;
  }, [session?.refreshToken]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (!session?.token) {
        throw new Error("Not authenticated");
      }
      const baseHeaders = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : { ...(init.headers as Record<string, string> | undefined) };
      let res = await fetch(input, { ...init, headers: { ...baseHeaders, Authorization: `Bearer ${session.token}` } });
      if (res.status === 401 && session.refreshToken) {
        try {
          const newToken = await refreshAccessToken();
          res = await fetch(input, { ...init, headers: { ...baseHeaders, Authorization: `Bearer ${newToken}` } });
        } catch (err) {
          doLogout();
          throw err;
        }
      }
      return res;
    },
    [session?.token, session?.refreshToken, refreshAccessToken, doLogout]
  );

  const fetchUserActiveCall = useCallback(async () => {
    if (!session || session.role !== "user") return;
    try {
      const res = await authFetch(`${API_BASE}/user/active-call`);
      if (res.status === 404) {
        setActiveCall(null);
        hostProducerIdRef.current = null;
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const call = data?.call;
      if (call) {
        const id = call.id || call.room_id;
        setActiveCall({
          id,
          started_at: call.started_at ?? new Date().toISOString(),
          routerRtpCapabilities: call.router_rtp_capabilities ?? null,
        });
        if (call.host_producer_id) {
          hostProducerIdRef.current = call.host_producer_id;
        }
      }
    } catch (err) {
      console.warn("[desktop] fetchUserActiveCall failed", err);
    }
  }, [authFetch, session]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied", "success");
      return;
    } catch {
      // fallback for contexts where navigator.clipboard is unavailable
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        if (ok) {
          showToast("Copied", "success");
          return;
        }
      } catch {
        // ignore and fall through
      }
      showToast("Copy failed", "error");
    }
  };

  const fetchUsers = async () => {
    if (!session?.token || session.role !== "host") return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await authFetch(`${API_BASE}/host/users`);
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
          enforce_single_device: u.enforce_single_device ?? null,
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
      const res = await authFetch(`${API_BASE}/host/users/${userId}`, {
        method: "DELETE",
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
      const res = await authFetch(`${API_BASE}/host/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword.trim() || undefined,
          enforceSingleDevice: createEnforceSingleDevice,
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
      setCreateEnforceSingleDevice(null);
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
      const res = await authFetch(`${API_BASE}/host/users/${editUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: editEnabled,
          password: editPassword.trim() || undefined,
          enforceSingleDevice: editEnforceSingleDevice,
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

  const loadUserSessions = async (userId: string) => {
    if (!session?.token) return;
    setUserSessionsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/host/users/${userId}/sessions`);
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = await res.json();
      setUserSessions(data.sessions || []);
      setUserSessionRequests(data.pendingRequests || []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load sessions", "error");
    } finally {
      setUserSessionsLoading(false);
    }
  };

  const approveUserSession = async (userId: string, requestId: string) => {
    if (!session?.token) return;
    try {
      const res = await authFetch(`${API_BASE}/host/users/${userId}/sessions/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error("Failed to approve session");
      showToast("Session approved. Old sessions have been revoked.", "success");
      loadUserSessions(userId); // Refresh
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to approve session", "error");
    }
  };

  const rejectUserSession = async (userId: string, requestId: string) => {
    if (!session?.token) return;
    try {
      const res = await authFetch(`${API_BASE}/host/users/${userId}/sessions/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error("Failed to reject session");
      showToast("Session request rejected.", "success");
      loadUserSessions(userId); // Refresh
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reject session", "error");
    }
  };

  const revokeUserSession = async (userId: string, sessionId: string) => {
    if (!session?.token) return;
    try {
      const res = await authFetch(`${API_BASE}/host/users/${userId}/sessions/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to revoke session");
      showToast("Session revoked. User has been logged out.", "success");
      loadUserSessions(userId); // Refresh
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to revoke session", "error");
    }
  };

  const fetchCalls = async () => {
    if (!session?.token || session.role !== "host") return;
    setCallsLoading(true);
    setCallsError(null);
    try {
      const res = await authFetch(`${API_BASE}/host/calls`);
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
      const res = await authFetch(`${API_BASE}/host/calls/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      const now = new Date().toISOString();
      setCalls((prev) => [{ id: data.roomId, status: "started", started_at: now, ended_at: null }, ...prev]);
      setActiveCall({ id: data.roomId, started_at: now, routerRtpCapabilities: data.routerRtpCapabilities ?? null });
      setActiveParticipants([]);
      if (window.mizcall?.openActiveCallWindow) {
        const payload = {
          session,
          call: { id: data.roomId, started_at: now, routerRtpCapabilities: data.routerRtpCapabilities ?? null },
          participants: [],
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
    if (!session?.token || session.role !== "host") return leaveCall();
    try {
      const res = await authFetch(`${API_BASE}/host/calls/${id}/end`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`End call failed (${res.status})`);
      const now = new Date().toISOString();
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "ended", ended_at: now } : c)));
      leaveCall();
      showToast("Call ended", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "End call failed", "error");
    }
  };

  const leaveCall = () => {
    cleanupCallMedia();
    setActiveCall(null);
    setActiveParticipants([]);
    setTab("calls");
  };

  const cleanupCallMedia = () => {
    console.log("[Desktop] Starting call media cleanup...");
    
    // Close consumer first (before transport)
    try {
      if (consumerRef.current) {
        console.log("[Desktop] Closing consumer");
        consumerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[Desktop] Error closing consumer:", e);
    }
    consumerRef.current = null;
    
    // Close producer
    try {
      if (producerRef.current) {
        console.log("[Desktop] Closing producer");
        producerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[Desktop] Error closing producer:", e);
    }
    producerRef.current = null;
    
    // Close transports
    try {
      if (sendTransportRef.current) {
        console.log("[Desktop] Closing send transport");
        sendTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[Desktop] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    try {
      if (recvTransportRef.current) {
        console.log("[Desktop] Closing recv transport");
        recvTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[Desktop] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    // Stop all local media tracks
    if (localStreamRef.current) {
      console.log("[Desktop] Stopping local media tracks");
      localStreamRef.current.getTracks().forEach((t) => {
        console.log("[Desktop] Stopping track:", t.id, t.label);
        t.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear remote audio element
    if (remoteAudioElRef.current) {
      console.log("[Desktop] Clearing remote audio element");
      remoteAudioElRef.current.srcObject = null;
      remoteAudioElRef.current.pause();
      remoteAudioElRef.current = null;
    }
    
    // Disconnect audio context nodes
    try {
      if (audioSourceRef.current) {
        console.log("[Desktop] Disconnecting audio source");
        audioSourceRef.current.disconnect();
      }
    } catch (e) {
      console.warn("[Desktop] Error disconnecting audio source:", e);
    }
    audioSourceRef.current = null;
    
    try {
      if (gainNodeRef.current) {
        console.log("[Desktop] Disconnecting gain node");
        gainNodeRef.current.disconnect();
      }
    } catch (e) {
      console.warn("[Desktop] Error disconnecting gain node:", e);
    }
    gainNodeRef.current = null;
    
    // Close audio context
    if (audioCtxRef.current) {
      console.log("[Desktop] Closing audio context");
      audioCtxRef.current.close().catch((e) => {
        console.warn("[Desktop] Error closing audio context:", e);
      });
      audioCtxRef.current = null;
    }
    
    // Clear remote stream
    setRemoteAudioStream(null);
    
    // Cleanup socket
    if (callSocketRef.current) {
      console.log("[Desktop] Cleaning up socket");
      // Emit CALL_STOPPED if we have an active call
      if (activeCall?.id) {
        callSocketRef.current.emit?.("CALL_STOPPED", { roomId: activeCall.id });
      }
      // Remove all listeners before disconnecting
      callSocketRef.current.removeAllListeners();
      callSocketRef.current.disconnect?.();
    }
    callSocketRef.current = null;
    
    // Clear device and refs
    deviceRef.current = null;
    hostProducerIdRef.current = null;
    routerCapsRef.current = null;
    
    // Reset state
    setCallJoinState("idle");
    setCallError(null);
    setPttActive(false);
    
    console.log("[Desktop] ✅ Call media cleanup complete");
  };

  const attachRemoteStream = (stream: MediaStream) => {
    setRemoteAudioStream(stream);
    if (!remoteAudioElRef.current) {
      remoteAudioElRef.current = new Audio();
      remoteAudioElRef.current.autoplay = true;
      remoteAudioElRef.current.controls = false;
      remoteAudioElRef.current.muted = false;
      remoteAudioElRef.current.style.display = "none";
      document.body.appendChild(remoteAudioElRef.current);
    }
    try {
      remoteAudioElRef.current.pause();
    } catch {
      // ignore
    }
    remoteAudioElRef.current.srcObject = stream;
    remoteAudioElRef.current.muted = false;
    remoteAudioElRef.current.volume = Math.max(0.1, callVolume / 100);
    try {
      remoteAudioElRef.current.load();
    } catch {
      // ignore
    }
    remoteAudioElRef.current.play().catch((err) => {
      console.warn("[desktop] audio play failed", err);
      // retry once after a short delay to avoid AbortError race
      setTimeout(() => {
        remoteAudioElRef.current?.play().catch((err2) => console.warn("[desktop] audio play retry failed", err2));
      }, 200);
    });

    // Web Audio fallback to force playback in Electron
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      // resume if suspended
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      audioSourceRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      audioSourceRef.current = ctx.createMediaStreamSource(stream);
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = callVolume / 100;
      audioSourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);
      console.log("[desktop] audio context wired", { state: ctx.state, volume: gainNodeRef.current.gain.value });
    } catch (err) {
      console.warn("[desktop] audio ctx wiring failed", err);
    }
  };

  const ensureDeviceLoaded = async () => {
    if (deviceRef.current) return deviceRef.current;
    const caps = routerCapsRef.current || activeCall?.routerRtpCapabilities;
    if (!caps) throw new Error("Missing router capabilities");
    const device = new Device();
    await device.load({ routerRtpCapabilities: caps });
    deviceRef.current = device;
    return device;
  };

  const drainPendingConsumes = () => {
    if (!recvTransportRef.current || !deviceRef.current || !callSocketRef.current || !activeCall) return;
    const pending = [...pendingConsumeRef.current];
    pendingConsumeRef.current = [];
    pending.forEach(({ producerId, ownerId }) => {
      callSocketRef.current?.emit("CONSUME", {
        producerId,
        producerOwnerId: ownerId,
        rtpCapabilities: deviceRef.current?.rtpCapabilities,
        roomId: activeCall.id,
      });
    });
  };

  const requestConsume = (producerId: string, producerOwnerId?: string) => {
    if (!callSocketRef.current || !activeCall) return;
    if (!recvTransportRef.current || !deviceRef.current) {
      pendingConsumeRef.current.push({ producerId, ownerId: producerOwnerId });
      return;
    }
    callSocketRef.current.emit("CONSUME", {
      producerId,
      producerOwnerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities,
      roomId: activeCall.id,
    });
  };

  const startHostProducer = async () => {
    if (producerRef.current || !sendTransportRef.current || session?.role !== "host") return;
    try {
      console.log("[desktop] Requesting microphone access for host producer...");
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      console.log("[desktop] Microphone access granted, got stream:", stream.id);
      console.log("[desktop] Audio tracks:", stream.getAudioTracks().map(t => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));
      
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      const producer = await sendTransportRef.current.produce({ track });
      producerRef.current = producer;
      track.enabled = !callMuted;
      producer.on("trackended", () => setCallMuted(true));
      setCallJoinState("connected");
      
      console.log("[desktop] Host producer created successfully");
    } catch (err) {
      const name = (err as any)?.name ?? "Error";
      const message = (err as any)?.message ?? String(err);
      console.error("[desktop] Host produce error:", err);
      console.error("[desktop] Error name:", name);
      console.error("[desktop] Error message:", message);
      
      if (name === "NotAllowedError") {
        setCallError("Microphone permission denied. Opening Settings...");
        
        // Show toast with helpful message
        showToast("Microphone permission required. Look for 'Electron' in System Settings.", "error");
        
        // Check if bridge is available
        console.log("[desktop] Checking mizcall bridge:", {
          hasMizcall: !!window.mizcall,
          hasOpenSystemSettings: !!window.mizcall?.openSystemSettings,
          isDevelopment: window.mizcall?.env !== "production"
        });
        
        // Auto-open System Settings on macOS
        if (window.mizcall?.openSystemSettings) {
          console.log("[desktop] Bridge available, opening System Settings...");
          console.log("[desktop] 💡 TIP: In development mode, look for 'Electron' or 'Electron Helper' in the microphone list");
          setTimeout(() => {
            window.mizcall?.openSystemSettings?.("microphone");
          }, 1000);
        } else {
          console.error("[desktop] Bridge not available! Cannot open System Settings");
          setCallError("Microphone permission denied. Please enable 'Electron' in System Settings > Privacy & Security > Microphone");
        }
      } else if (name === "NotFoundError") {
        setCallError("No microphone found. Please connect a microphone.");
      } else if (name === "NotReadableError") {
        setCallError("Microphone is busy or unavailable.");
      } else {
        setCallError("Microphone not available: " + message);
      }
    }
  };

  const startUserPtt = async () => {
    if (session?.role !== "user" || pttActive) return;
    if (callJoinState !== "connected") {
      showToast("Audio not ready yet", "error");
      return;
    }
    if (!sendTransportRef.current) {
      showToast("Audio not ready yet", "error");
      return;
    }
    try {
      console.log("[desktop] Requesting microphone access for PTT...");
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      console.log("[desktop] Microphone access granted for PTT, got stream:", stream.id);
      
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      const producer = await sendTransportRef.current.produce({ track });
      producerRef.current = producer;
      setPttActive(true);
      callSocketRef.current?.emit?.("USER_SPEAKING_START");
      
      console.log("[desktop] User PTT producer created successfully");
    } catch (err) {
      const name = (err as any)?.name ?? "Error";
      const message = (err as any)?.message ?? String(err);
      console.error("[desktop] PTT error:", err);
      console.error("[desktop] Error name:", name);
      console.error("[desktop] Error message:", message);
      
      if (name === "NotAllowedError") {
        showToast("Microphone permission denied. Look for 'Electron' in System Settings.", "error");
        
        // Check if bridge is available
        console.log("[desktop] Checking mizcall bridge:", {
          hasMizcall: !!window.mizcall,
          hasOpenSystemSettings: !!window.mizcall?.openSystemSettings
        });
        
        console.log("[desktop] 💡 TIP: In development mode, look for 'Electron' or 'Electron Helper' in the microphone permissions list");
        
        // Auto-open System Settings
        if (window.mizcall?.openSystemSettings) {
          console.log("[desktop] Bridge available, opening System Settings...");
          setTimeout(() => {
            window.mizcall?.openSystemSettings?.("microphone");
          }, 1000);
        } else {
          console.error("[desktop] Bridge not available! Cannot open System Settings");
          showToast("Please enable 'Electron' in System Settings > Privacy & Security > Microphone", "error");
        }
      } else if (name === "NotFoundError") {
        showToast("No microphone found. Please connect a microphone.", "error");
      } else if (name === "NotReadableError") {
        showToast("Microphone is busy or unavailable.", "error");
      } else {
        showToast("Cannot access microphone: " + message, "error");
      }
    }
  };

  const stopUserPtt = () => {
    if (session?.role !== "user") return;
    try {
      producerRef.current?.close?.();
    } catch {
      // ignore
    }
    producerRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    callSocketRef.current?.emit?.("USER_SPEAKING_STOP");
    setPttActive(false);
  };

  const joinActiveCall = async () => {
    if (!session || !activeCall) return;
    cleanupCallMedia();
    setCallJoinState("connecting");
    setCallError(null);
    routerCapsRef.current = activeCall.routerRtpCapabilities ?? null;
    console.log("[desktop] joinActiveCall", {
      role: session.role,
      roomId: activeCall.id,
      hasCaps: !!routerCapsRef.current,
      hostProducer: hostProducerIdRef.current,
    });

    const ws: Socket = io("https://custom.mizcall.com", {
      transports: ["websocket"],
      withCredentials: true,
    });
    callSocketRef.current = ws;

    ws.on("connect", () => {
      console.log("[desktop] call-sio connect");
      ws.emit("AUTH", { token: session.token });
      ws.emit("CALL_STARTED", { roomId: activeCall.id });
      ws.emit("GET_ROUTER_CAPS", { roomId: activeCall.id });
      ws.emit("JOIN", { token: session.token, roomId: activeCall.id });
      if (session.role === "user") {
        ws.emit("REQUEST_HOST_PRODUCER", { roomId: activeCall.id });
      }
    });

    ws.on("connect_error", () => {
      console.warn("[desktop] call-sio error");
      setCallJoinState("error");
      setCallError("Socket error");
    });

    ws.on("disconnect", () => {
      console.log("[desktop] call-sio disconnect");
      setCallJoinState((prev) => (prev === "connected" ? prev : "idle"));
    });

    const handleMsg = async (msgRaw: any) => {
      try {
        const msg = msgRaw || {};
        console.log("[desktop] call-sio message", msg.type, msg);

        if (msg.type === "ROUTER_CAPS") {
          routerCapsRef.current = msg.routerRtpCapabilities;
          if (!hostProducerIdRef.current && msg.hostProducerId) {
            hostProducerIdRef.current = msg.hostProducerId;
            if (session.role === "user") {
              requestConsume(msg.hostProducerId);
            }
          } else if (session.role === "user" && !msg.hostProducerId) {
            console.log("[desktop] ROUTER_CAPS missing host producer; requesting");
            ws.emit("REQUEST_HOST_PRODUCER", { roomId: activeCall.id });
          }
        }

        if (msg.type === "SEND_TRANSPORT_CREATED") {
          const device = await ensureDeviceLoaded();
          const transport = device.createSendTransport(msg.params);
          transport.on("connect", ({ dtlsParameters }, callback) => {
            ws.emit("CONNECT_SEND_TRANSPORT", { dtlsParameters, roomId: activeCall.id });
            callback();
          });
          transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
            try {
              ws.emit("PRODUCE", { kind, rtpParameters, roomId: activeCall.id });
              const randomId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
              callback({ id: randomId });
            } catch (err) {
              errback?.(err as Error);
            }
          });
          sendTransportRef.current = transport;
          if (session.role === "host") {
            startHostProducer();
            setCallJoinState("connected");
            setCallError(null);
          }
        }

        if (msg.type === "RECV_TRANSPORT_CREATED") {
          const device = await ensureDeviceLoaded();
          const transport = device.createRecvTransport(msg.params);
          transport.on("connect", ({ dtlsParameters }, callback) => {
            ws.emit("CONNECT_RECV_TRANSPORT", { dtlsParameters, roomId: activeCall.id });
            callback();
          });
          recvTransportRef.current = transport;

          if (session.role === "user" && hostProducerIdRef.current) {
            console.log("[desktop] requesting consume host producer", hostProducerIdRef.current);
            requestConsume(hostProducerIdRef.current);
          } else if (session.role === "user") {
            console.log("[desktop] RECV created; requesting host producer");
            ws.emit("REQUEST_HOST_PRODUCER", { roomId: activeCall.id });
            // Mark as ready even if host producer not yet available; we'll consume when it arrives
            setCallJoinState("connected");
            setCallError(null);
          } else if (session.role === "host") {
            setCallJoinState("connected");
            setCallError(null);
          }
          drainPendingConsumes();
        }

        if (msg.type === "HOST_PRODUCER") {
          hostProducerIdRef.current = msg.producerId;
          console.log("[desktop] host producer received", msg.producerId);
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }
          if (session.role === "user" && msg.producerId) {
            requestConsume(msg.producerId);
          }
        }

        if (msg.type === "NEW_PRODUCER") {
          if (session.role === "host" && msg.ownerRole === "user") {
            setActiveParticipants((prev) => {
              const exists = prev.some((p) => p.id === (msg.userId || "unknown"));
              if (exists) return prev;
              return [
                ...prev,
                {
                  id: msg.userId || msg.producerId,
                  name: msg.userId || "User",
                  role: "User" as const,
                  status: "connected" as const,
                  muted: false,
                  speaking: false,
                },
              ];
            });
            requestConsume(msg.producerId, msg.userId);
          }
          if (session.role === "user" && msg.ownerRole === "host") {
            requestConsume(msg.producerId);
          }
        }

        if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
          if (!recvTransportRef.current) return;
          const params = msg.params || msg;
          console.log("[desktop] CONSUMER_CREATED", params);
          try {
            consumerRef.current?.close?.();
          } catch {
            // ignore
          }
          const consumer = await recvTransportRef.current.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind ?? "audio",
            rtpParameters: params.rtpParameters,
          });
          consumerRef.current = consumer;
          await consumer.resume?.();
          const stream = new MediaStream([consumer.track]);
          console.log("[desktop] attaching remote audio", {
            id: consumer?.id,
            kind: consumer?.kind,
            enabled: consumer?.track?.enabled,
            readyState: consumer?.track?.readyState,
            settings: consumer?.track?.getSettings?.(),
          });
          const track = consumer?.track as any;
          if (track) {
            track.enabled = true;
            track.onended = () => console.log("[desktop] consumer track ended");
            track.onmute = () => console.log("[desktop] consumer track mute");
            track.onunmute = () => console.log("[desktop] consumer track unmute");
          }
          attachRemoteStream(stream);
          setCallJoinState("connected");
          setCallError(null);
        }

        if (msg.type === "USER_JOINED") {
          setActiveParticipants((prev) => {
            if (prev.some((p) => p.id === msg.userId)) return prev;
            return [
              ...prev,
              {
                id: msg.userId,
                name: msg.userId,
                role: "User" as const,
                status: "connected" as const,
                muted: true,
                speaking: false,
              },
            ];
          });
        }

        if (msg.type === "USER_LEFT") {
          setActiveParticipants((prev) => prev.filter((p) => p.id !== msg.userId));
        }
      } catch (err) {
        console.error("ws message error", err);
      }
    };

    ws.on("message", (payload) => handleMsg(payload));
    [
      "ROUTER_CAPS",
      "SEND_TRANSPORT_CREATED",
      "RECV_TRANSPORT_CREATED",
      "HOST_PRODUCER",
      "NEW_PRODUCER",
      "CONSUMER_CREATED",
      "PRODUCED",
      "CONSUME_ERROR",
      "PRODUCE_ERROR",
      "USER_JOINED",
      "USER_LEFT",
    ].forEach((event) => {
      ws.on(event, (payload) => handleMsg(payload ?? { type: event }));
    });
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const formatDateShort = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const handleChangePasswordSubmit = async () => {
    setPwError(null);
    if (!pwCurrent.trim()) {
      setPwError("Current password is required");
      return;
    }
    if (!pwNew.trim()) {
      setPwError("New password is required");
      return;
    }
    if (pwNew.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (!session?.token || session.role !== "host") {
      setPwError("Not authenticated");
      return;
    }
    try {
      setPwLoading(true);
      const res = await authFetch(`${API_BASE}/host/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to change password");
      }
      setSession((prev) => (prev ? { ...prev, password: pwNew } : prev));
      showToast("Password changed", "success");
      setShowChangePassword(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setPwError(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to change password";
      setPwError(msg);
      showToast(msg, "error");
    } finally {
      setPwLoading(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    if (!session || session.role !== "host") return;
    try {
      const nextValue = !twoFactorEnabled;
      setTwoFactorEnabled(nextValue);
      const res = await authFetch(`${API_BASE}/host/security`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEnabled: nextValue }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update security settings");
      }
      setSession((prev) => (prev ? { ...prev, twoFactorEnabled: nextValue } : prev));
      showToast("Security settings updated", "success");
    } catch (err) {
      setTwoFactorEnabled((prev) => !prev);
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const handleToggleMultipleSessions = async () => {
    if (!session || session.role !== "host") return;
    try {
      const next = !allowMultipleSessions;
      setAllowMultipleSessions(next);
      const body: any = { allowMultipleSessions: next };
      if (!next && session.refreshToken) {
        body.refreshToken = session.refreshToken;
      }
      const res = await authFetch(`${API_BASE}/host/security`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update security settings");
      }
      const payload = await res.json().catch(() => ({}));
      setSession((prev) =>
        prev
          ? {
              ...prev,
              allowMultipleSessions: next,
              refreshToken: payload.refreshToken ?? prev.refreshToken,
            }
          : prev
      );
      showToast(next ? "Multiple sessions allowed" : "Single session enforced", "success");
    } catch (err) {
      setAllowMultipleSessions((prev) => !prev);
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const handleToggleUserSingleDevice = async () => {
    if (!session || session.role !== "host") return;
    try {
      const next = !oneDeviceOnly;
      setOneDeviceOnly(next);
      const res = await authFetch(`${API_BASE}/host/security`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enforceUserSingleSession: next }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update security settings");
      }
      showToast(
        next 
          ? "One User, One Device enabled. Users will be restricted to one device." 
          : "One User, One Device disabled. Users can login on multiple devices.",
        "success"
      );
    } catch (err) {
      setOneDeviceOnly((prev) => !prev);
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const handleToggleDeviceLock = async () => {
    const next = !deviceLockEnabled;
    if (!next) {
      // Disabling - just turn off
      setDeviceLockEnabled(false);
      try {
        localStorage.setItem("mizcall.deviceLockEnabled", "false");
      } catch {}
      showToast("Device lock disabled", "success");
      return;
    }

    // Enabling - use biometric if available, otherwise password
    if (biometricSupport?.available) {
      try {
        const result = await window.mizcall?.authenticateBiometric?.("enable device lock");
        if (result?.success) {
          setDeviceLockEnabled(true);
          try {
            localStorage.setItem("mizcall.deviceLockEnabled", "true");
          } catch {}
          showToast(`Device lock enabled with ${biometricSupport.type === "touchid" ? "Touch ID" : "biometric"}. You'll be prompted when opening the app.`, "success");
        } else {
          showToast("Authentication failed. Device lock not enabled.", "error");
        }
      } catch (error) {
        console.error("[Desktop] Biometric auth error:", error);
        showToast("Authentication failed. Device lock not enabled.", "error");
      }
    } else {
      // No biometric support - use password
      setShowDeviceLockPrompt(true);
      setDeviceLockPassword("");
      setDeviceLockError(null);
    }
  };

  const handleEnableDeviceLock = () => {
    if (!deviceLockPassword.trim()) {
      setDeviceLockError("Please enter your password");
      return;
    }

    // Verify password matches current session password
    if (deviceLockPassword !== session?.password) {
      setDeviceLockError("Incorrect password");
      return;
    }

    // Enable device lock
    setDeviceLockEnabled(true);
    try {
      localStorage.setItem("mizcall.deviceLockEnabled", "true");
    } catch {}
    
    setShowDeviceLockPrompt(false);
    setDeviceLockPassword("");
    setDeviceLockError(null);
    showToast("Device lock enabled. You'll need to enter your password when opening the app.", "success");
  };

  const handleDeviceLockAuthWithPassword = () => {
    // Password authentication
    if (!deviceLockAuthPassword.trim()) {
      setDeviceLockError("Please enter your password");
      return;
    }

    // Verify password
    if (deviceLockAuthPassword !== session?.password) {
      setDeviceLockError("Incorrect password");
      setDeviceLockAuthPassword("");
      return;
    }

    // Authentication successful
    setShowDeviceLockAuth(false);
    setDeviceLockAuthPassword("");
    setDeviceLockError(null);
    showToast("Welcome back!", "success");
  };

  const handleDeviceLockAuthWithBiometric = async () => {
    try {
      const result = await window.mizcall?.authenticateBiometric?.("unlock MizCall");
      if (result?.success) {
        // Biometric authentication successful
        setShowDeviceLockAuth(false);
        setDeviceLockAuthPassword("");
        setDeviceLockError(null);
        showToast("Welcome back!", "success");
      } else {
        // Biometric failed
        setDeviceLockError(`${biometricSupport?.type === "touchid" ? "Touch ID" : "Biometric"} authentication failed. Try password instead.`);
      }
    } catch (error) {
      console.error("[Desktop] Biometric auth error:", error);
      setDeviceLockError("Authentication failed. Try password instead.");
    }
  };

  // Auto-trigger biometric auth on device lock screen mount
  useEffect(() => {
    if (showDeviceLockAuth && biometricSupport?.available) {
      // Auto-prompt for biometric when lock screen appears
      setTimeout(() => {
        handleDeviceLockAuthWithBiometric();
      }, 300);
    }
  }, [showDeviceLockAuth, biometricSupport]);

  const loadSessions = useCallback(async () => {
    if (!session || session.role !== "host") return;
    setSessionsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/host/sessions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to load devices");
      }
      const data = await res.json();
      const normalized =
        data.sessions?.map((s: any) => ({
          id: s.id,
          deviceLabel: s.deviceLabel ?? s.devicelabel ?? "Unknown device",
          deviceName: s.deviceName ?? s.devicename ?? null,
          modelName: s.modelName ?? s.modelname ?? null,
          platform: s.platform ?? null,
          userAgent: s.userAgent ?? s.useragent ?? null,
          createdAt: s.createdAt ?? s.createdat ?? null,
          lastSeenAt: s.lastSeenAt ?? s.lastseenat ?? null,
          isCurrent: session?.sessionId ? String(session.sessionId) === String(s.id) : false,
        })) ?? [];
      setSessions(normalized);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load devices", "error");
    } finally {
      setSessionsLoading(false);
    }
  }, [authFetch, session]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      if (!session || session.role !== "host") return;
      try {
        const res = await authFetch(`${API_BASE}/host/sessions/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to log out device");
        }
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        showToast("Device logged out", "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to log out device", "error");
      }
    },
    [authFetch, session]
  );

  const openSessions = useCallback(async () => {
    setSessionsVisible(true);
    await loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (tab === "users" && session?.role === "host") {
      fetchUsers();
    }
    if (tab === "calls" && session?.role === "host") {
      fetchCalls();
    }

    // For users, when landing on dashboard, check if host already has an active call
    if (tab === "dashboard" && session?.role === "user") {
      fetchUserActiveCall();
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

  useEffect(() => {
    if (!session || session.role !== "user") {
      userWsRef.current?.disconnect?.();
      userWsRef.current = null;
      return;
    }
    if (userWsRef.current) return;

    const ws: Socket = io("https://custom.mizcall.com", {
      transports: ["websocket"],
      withCredentials: true,
    });
    userWsRef.current = ws;

    ws.on("connect", () => {
      console.log("[desktop:user-sio] open");
      setNetworkStatus("online");
      ws.emit("auth", { token: session.token });
    });
    ws.on("message", (msg) => {
      try {
        console.log("[desktop:user-sio] message", msg.type, msg);
        if (msg.type === "SESSION_REVOKED") {
          console.log("[desktop:user-sio] Session revoked:", msg);
          const message = msg.message || "You have been logged out.";
          showToast(message, "error");
          // Log out after a short delay
          setTimeout(() => {
            doLogout();
          }, 2000);
          return;
        }
        if (msg.type === "call-started") {
          routerCapsRef.current = msg.routerRtpCapabilities ?? null;
          setActiveCall({
            id: msg.roomId ?? "main-room",
            started_at: new Date().toISOString(),
            routerRtpCapabilities: msg.routerRtpCapabilities ?? null,
          });
          if (!msg.routerRtpCapabilities && msg.roomId) {
            ws.emit("get-router-caps", { roomId: msg.roomId });
          }
        }
        if (msg.type === "call-stopped") {
          setActiveCall(null);
          setActiveParticipants([]);
        }
        if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "host") {
          hostProducerIdRef.current = msg.producerId;
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
            setActiveCall((prev) => (prev ? { ...prev, routerRtpCapabilities: msg.routerRtpCapabilities } : prev));
          } else if (activeCall?.id) {
            ws.emit("get-router-caps", { roomId: activeCall.id });
          }
          requestConsume(msg.producerId);
        }
        if (msg.type === "HOST_PRODUCER" && msg.producerId) {
          hostProducerIdRef.current = msg.producerId;
           if (msg.routerRtpCapabilities) {
             routerCapsRef.current = msg.routerRtpCapabilities;
             setActiveCall((prev) => (prev ? { ...prev, routerRtpCapabilities: msg.routerRtpCapabilities } : prev));
           } else if (activeCall?.id) {
             ws.emit("get-router-caps", { roomId: activeCall.id });
           }
          requestConsume(msg.producerId);
        }
        if (msg.type === "ROUTER_CAPS") {
          routerCapsRef.current = msg.routerRtpCapabilities ?? null;
          setActiveCall((prev) => (prev ? { ...prev, routerRtpCapabilities: msg.routerRtpCapabilities ?? null } : prev));
        }
      } catch {
        // ignore malformed
      }
    });
    ws.on("disconnect", () => {
      console.log("[desktop:user-sio] close");
      setNetworkStatus("offline");
      userWsRef.current = null;
    });
    
    // Listen for session revocation as specific event
    ws.on("SESSION_REVOKED", (data) => {
      console.log("[desktop:user-sio] Session revoked:", data);
      const message = data.message || "You have been logged out.";
      showToast(message, "error");
      setTimeout(() => {
        doLogout();
      }, 2000);
    });

    return () => {
      ws.disconnect();
      userWsRef.current = null;
    };
  }, [session?.token, session?.role]);

  useEffect(() => {
    if (!session || !activeCall || tab !== "call-active") {
      if (tab !== "call-active") {
        cleanupCallMedia();
      }
      return;
    }
    joinActiveCall();
    return () => {
      cleanupCallMedia();
    };
  }, [session?.token, session?.role, activeCall?.id, tab]);

  useEffect(() => {
    if (tab === "recordings" && session?.role === "host") {
      fetchRecordings();
    }
  }, [tab, session?.role, session?.token]);

  useEffect(() => {
    if (!remoteAudioStream) return;
    if (!remoteAudioElRef.current) {
      remoteAudioElRef.current = new Audio();
      remoteAudioElRef.current.autoplay = true;
      remoteAudioElRef.current.controls = false;
      remoteAudioElRef.current.style.display = "none";
      document.body.appendChild(remoteAudioElRef.current);
    }
    remoteAudioElRef.current.srcObject = remoteAudioStream;
    remoteAudioElRef.current.muted = false;
    remoteAudioElRef.current.volume = callVolume / 100;
    remoteAudioElRef.current.play().catch((err) => console.warn("[desktop] audio play failed", err));

    // keep gain node in sync
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = callVolume / 100;
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [remoteAudioStream, callVolume, callMuted]);

  useEffect(() => {
    if (session?.role === "host" && producerRef.current?.track) {
      producerRef.current.track.enabled = !callMuted;
    }
  }, [callMuted, session?.role]);

  const showToast = (message: string, kind: "info" | "success" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image", "error");
      e.target.value = "";
      return;
    }
    if (!session?.token) {
      showToast("Not authenticated", "error");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    const endpoint = session.role === "host" ? "/host/avatar" : "/user/avatar";

    try {
      const res = await authFetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("[desktop] avatar upload resp", endpoint, data);
      if (!res.ok) {
        showToast("Upload failed", "error");
        return;
      }
      const avatarUrl =
        typeof data.avatarUrl === "string" && data.avatarUrl
          ? data.avatarUrl.startsWith("http")
            ? data.avatarUrl
            : `${API_BASE}${data.avatarUrl}`
          : null;
      if (avatarUrl) {
        setSession((prev) => (prev ? { ...prev, avatarUrl } : prev));
      showToast("Profile picture updated", "success");
      } else {
        showToast("Upload succeeded but no URL returned", "info");
      }
    } catch (err) {
      console.error("[desktop] avatar upload error", err);
      showToast("Upload failed", "error");
    } finally {
      e.target.value = "";
    }
    e.target.value = "";
  };

  const fetchRecordings = async () => {
    if (!session?.token || session.role !== "host") return;
    setRecordingsLoading(true);
    setRecordingsError(null);
    try {
      const res = await authFetch(`${API_BASE}/host/recordings`);
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to load recordings");
      }
      const json = (await res.json()) as Record<string, Record<string, Array<{ id: string; time: string }>>>;
      const grouped: Array<{
        userName: string;
        dates: { date: string; recordings: Array<{ id: string; time: string }> }[];
      }> = Object.entries(json || {}).map(([userName, dates]) => ({
        userName,
        dates: Object.entries(dates || {})
          .sort((a, b) => (a[0] > b[0] ? -1 : 1))
          .map(([date, clips]) => ({
            date,
            recordings: (clips || []).slice().sort((a, b) => (a.time > b.time ? -1 : 1)),
          })),
      }));
      setRecordings(grouped);
    } catch (err: any) {
      setRecordingsError(err?.message || "Failed to load recordings");
    } finally {
      setRecordingsLoading(false);
    }
  };

  const playRecording = async (recId: string) => {
    if (!session?.token || session.role !== "host") return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      let playbackToken = session.token;
      if (session.refreshToken) {
        try {
          playbackToken = await refreshAccessToken();
        } catch {
          // fallback to existing token if refresh fails; playback may error and will be handled below
        }
      }
      const src = `${API_BASE}/recordings/${recId}/stream?token=${encodeURIComponent(playbackToken)}`;
      audioRef.current.src = src;
      await audioRef.current.play();
      setPlayingRecordingId(recId);
      audioRef.current.onended = () => setPlayingRecordingId((current) => (current === recId ? null : current));
    } catch (err) {
      console.error("[desktop] play recording error", err);
      showToast("Playback failed", "error");
      setPlayingRecordingId(null);
    }
  };

  const stopRecording = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingRecordingId(null);
  };

  const deleteRecording = async (recId: string) => {
    if (!session?.token || session.role !== "host") return;
    try {
      const res = await authFetch(`${API_BASE}/host/recordings/${recId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Delete failed");
      }
      setRecordings((prev) =>
        prev
          .map((u) => ({
            ...u,
            dates: u.dates
              .map((d) => ({
                ...d,
                recordings: d.recordings.filter((r) => r.id !== recId),
              }))
              .filter((d) => d.recordings.length > 0),
          }))
          .filter((u) => u.dates.length > 0),
      );
      if (playingRecordingId === recId) stopRecording();
      showToast("Recording deleted", "success");
    } catch (err: any) {
      showToast(err?.message || "Delete failed", "error");
    }
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

  const openEditProfileModal = () => {
    setEditProfileName(session?.name || "");
    setEditProfileEmail(session?.email || session?.name || "");
    setEditProfileError(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    setEditProfileError(null);
    if (!session?.token || session.role !== "host") {
      setEditProfileError("Not authenticated");
      return;
    }
    if (!editProfileName.trim()) {
      setEditProfileError("Name is required");
      return;
    }
    if (!editProfileEmail.trim() || !editProfileEmail.includes("@")) {
      setEditProfileError("Valid email is required");
      return;
    }
    try {
      setEditProfileLoading(true);
      const res = await authFetch(`${API_BASE}/host/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editProfileEmail.trim(), email: editProfileEmail.trim(), displayName: editProfileName.trim() }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update profile");
      }
      const data = await res.json();
      const updatedName = data.name || editProfileName.trim();
      const updatedEmail = data.email || editProfileEmail.trim();
      setSession((prev) => (prev ? { ...prev, name: updatedName, email: updatedEmail } : prev));
      showToast("Profile updated", "success");
      setShowEditProfile(false);
    } catch (err: any) {
      const msg = err?.message || "Failed to update profile";
      setEditProfileError(msg);
      showToast(msg, "error");
    } finally {
      setEditProfileLoading(false);
    }
  };

  const renderAuthShell = () => {
    if (hostOtpPending) {
      return (
        <div className="auth-shell">
          <div className="auth-left single">
            <div className="logo-wrap">
              <img src={logoWhite} alt="MizCall" className="logo-img" />
            </div>
            <div className="auth-card flat verify-card">
              <div className="stack gap-xxs center">
                <h2 className="title auth-title">Enter login code</h2>
                <p className="muted small">We sent a 6-digit code to {hostOtpPending.email || "your email"}</p>
                <button className="linklike" onClick={() => { setHostOtpPending(null); setLoginOtpCode(""); }}>Use a different account</button>
              </div>
              <Input
                label="OTP Code"
                value={loginOtpCode}
                onChange={setLoginOtpCode}
                placeholder="123456"
              />
              {loginOtpError ? <p className="error">{loginOtpError}</p> : null}
              <div className="full-width">
                <Button label={loginOtpLoading ? "Verifying…" : "Verify"} onClick={verifyHostLoginOtp} loading={loginOtpLoading} />
              </div>
              <div className="resend-row">
                <span className="muted small">Didn’t receive the code?</span>
                <button className="linklike" disabled={loginOtpResendTimer > 0 || loginOtpLoading} onClick={resendHostLoginOtp}>
                  Resend OTP {loginOtpResendTimer > 0 ? `(${loginOtpResendTimer}s)` : ""}
                </button>
              </div>
            </div>
          </div>
          <div className="auth-right">
            <div className="auth-hero">
              <h2 className="title auth-title">Protecting your account</h2>
              <p className="muted">
                Two-factor authentication keeps your host account secure. Enter the code we emailed to continue.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (forgotStep !== "none") {
      return (
        <div className="auth-shell">
          <div className="auth-left single">
            <div className="logo-wrap">
              <img src={logoWhite} alt="MizCall" className="logo-img" />
            </div>
            <div className="auth-card flat">
              <div className="stack gap-xxs center">
                <h2 className="title auth-title">Reset your password</h2>
                <p className="muted small">Hosts only. We’ll email you a reset code.</p>
              </div>
              {forgotStep === "request" && (
                <>
                  <Input
                    label="Email or Host ID"
                    value={forgotIdentifier}
                    onChange={setForgotIdentifier}
                    placeholder="host@example.com or H123456"
                  />
                  {forgotError ? <p className="error">{forgotError}</p> : null}
                  <div className="full-width">
                    <Button label={forgotLoading ? "Sending…" : "Send code"} onClick={handleForgotSendOtp} loading={forgotLoading} />
                  </div>
                  <button className="linklike center" onClick={() => { setForgotStep("none"); setForgotError(null); }}>
                    Back to sign in
                  </button>
                </>
              )}
              {forgotStep === "reset" && (
                <>
                  <Input label="OTP Code" value={forgotOtp} onChange={setForgotOtp} placeholder="123456" />
                  <Input label="New Password" value={forgotNewPassword} onChange={setForgotNewPassword} type="password" placeholder="Minimum 6 characters" />
                  <Input label="Confirm Password" value={forgotConfirmPassword} onChange={setForgotConfirmPassword} type="password" placeholder="Re-enter password" />
                  {forgotError ? <p className="error">{forgotError}</p> : null}
                  <div className="full-width">
                    <Button label={forgotLoading ? "Resetting…" : "Reset password"} onClick={handleForgotReset} loading={forgotLoading} />
                  </div>
                  <button className="linklike center" onClick={() => { setForgotStep("request"); setForgotError(null); }}>
                    Resend code
                  </button>
                  <button className="linklike center" onClick={() => { setForgotStep("none"); setForgotError(null); }}>
                    Back to sign in
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="auth-right">
            <div className="auth-hero">
              <h2 className="title auth-title">Secure access</h2>
              <p className="muted">
                Reset your host password with a one-time code. Keep your account safe and only share codes with trusted contacts.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (screen === "register") {
      return (
        <Register
          goLogin={() => setScreen("login")}
          onBack={() => setScreen("login")}
        />
      );
    }

    return (
      <Login
        goRegister={() => setScreen("register")}
        onBack={() => setScreen("login")}
        onSubmit={doLogin}
        loading={loading}
        error={error}
        onForgot={() => { setForgotStep("request"); setForgotError(null); }}
      />
    );
  };

  const renderAppShell = () => {
    if (!session) return null;
    const name = session.name ?? (session.role === "host" ? session.hostId : session.userId) ?? "User";
    const initials = name.slice(0, 2).toUpperCase();
    const userId = session.userId ?? session.hostId ?? "N/A";

    const renderActiveCall = () => {
      if (!activeCall) {
        return (
          <div className="card stack gap-sm">
            <p className="muted strong">Active Call</p>
            <p className="muted">No active call. Start a call from Dashboard or Calls.</p>
          </div>
        );
      }

      if (session.role === "user") {
        return (
          <div className="stack gap-sm">
            <div className="card stack gap-sm">
              <div className="row-inline between">
                <div className="stack gap-xxs">
                  <p className="muted strong">Active Call</p>
                  <p className="muted small">Call ID: {activeCall.id}</p>
                </div>
                <span className="muted small">
                  {callJoinState === "connected"
                    ? hostProducerIdRef.current
                      ? "Audio connected"
                      : "Ready (waiting for host audio)"
                    : callJoinState === "connecting"
                    ? "Connecting…"
                    : callError || "Idle"}
                </span>
              </div>
              <p className="muted small">You will only hear the host. Press and hold to speak.</p>
              <div className="participants-grid">
                <div className="participant-card">
                  <div className="participant-header">
                    <div className="avatar-sm">{(session.hostId || "H")[0]}</div>
                    <div className="stack gap-xxs">
                      <strong>Host</strong>
                      <span className="muted small">Broadcasting</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card call-footer">
              <button
                className={`mute-btn ${pttActive ? "unmuted" : "muted"}`}
                onPointerDown={startUserPtt}
                onPointerUp={stopUserPtt}
                onPointerLeave={stopUserPtt}
              >
                {pttActive ? <FiVolume2 /> : <FiMic />}
                <span>{pttActive ? "Talking…" : "Hold to talk"}</span>
              </button>
              <Button label="Leave call" variant="secondary" onClick={leaveCall} />
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
              <span className="muted small">
                {callJoinState === "connected" ? "Audio connected" : callJoinState === "connecting" ? "Connecting…" : callError || "Idle"}
              </span>
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

            {session.role === "user" && activeCall ? (
              <div className="card stack gap-sm">
                <p className="muted strong">Active call</p>
                <div className="row-inline between">
                  <div className="stack gap-xxs">
                    <strong>Room: {activeCall.id}</strong>
                    <span className="muted small">Host: {session.hostId ?? "Host"}</span>
                    <span className="muted small">Status: {callJoinState === "connected" ? "Connected" : "Ready"}</span>
                  </div>
                  <Button label="Join call" variant="primary" onClick={() => setTab("call-active")} />
                </div>
              </div>
            ) : null}

            <div className="stats-grid">
              {session.role === "host" ? (
                <>
              <div className="card stat-card">
                <p className="muted strong">Total Users</p>
                <h3 className="stat-number">120</h3>
              </div>
              <div className="card stat-card">
                <p className="muted strong">Active Users</p>
                <h3 className="stat-number">18</h3>
              </div>
                </>
              ) : null}
              <div className="card stat-card highlight-card">
                <p className="muted strong">Total Calls</p>
                <h3 className="stat-number">71</h3>
              </div>
              <div className="card stat-card highlight-card">
                <p className="muted strong">Network Status</p>
                <p className="muted small">Excellent · 99ms</p>
              </div>
              <div className="card stat-card highlight-card">
                <p className="muted strong">Connection</p>
                <p className="muted small">Connected</p>
              </div>
            </div>

            <div className="grid-2">
              <div className="card list-card stack gap-sm">
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
              <div className="card list-card stack gap-sm">
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
                            setEditEnforceSingleDevice(u.enforce_single_device ?? null);
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
        if (session.role !== "host") {
        return (
            <div className="card stack gap-sm">
              <p className="muted strong">Recordings</p>
              <p className="muted">Only hosts can access recordings.</p>
            </div>
          );
        }

        const empty = !recordingsLoading && recordings.length === 0;

        return (
          <div className="stack gap-sm card">
            <div className="stack gap-sm recordings-card">
              <div className="row-inline between">
            <div className="stack gap-xxs">
                  <p className="muted strong">Recordings</p>
                  <span className="muted small">Access and play saved clips organized by date.</span>
                </div>
                <div className="row-inline gap-sm">
                  <Button label="Refresh" variant="secondary" onClick={fetchRecordings} loading={recordingsLoading} />
                </div>
              </div>

              {recordingsError ? <p className="error">{recordingsError}</p> : null}
              {recordingsLoading ? <p className="muted">Loading recordings…</p> : null}

              {empty ? (
                <div className="card subtle stack gap-xxs borderless">
                  <p className="muted strong">No recordings found</p>
                  <p className="muted small">Recordings will appear here after calls are captured.</p>
                </div>
              ) : (
                <div className="stack gap-xs">
                  {recordings.map((user) => (
                    <div key={user.userName} className="card subtle stack gap-xxs borderless">
                      <button
                        className="row-inline between folder-row"
                        onClick={() => {
                          setExpandedUsers((prev) => {
                            const next = new Set(prev);
                            if (next.has(user.userName)) next.delete(user.userName);
                            else next.add(user.userName);
                            return next;
                          });
                        }}
                      >
                        <div className="row-inline gap-sm align-center">
                          <span className="folder-icon">{expandedUsers.has(user.userName) ? "📂" : "📁"}</span>
                          <strong>{user.userName}</strong>
                        </div>
                        <FiChevronRight
                          className={expandedUsers.has(user.userName) ? "chevron chevron-open" : "chevron"}
                        />
                      </button>

                      {expandedUsers.has(user.userName)
                        ? user.dates.map((date) => (
                            <div key={`${user.userName}-${date.date}`} className="card subtle nested borderless">
                              <button
                                className="row-inline between folder-row"
                                onClick={() => {
                                  const key = `${user.userName}-${date.date}`;
                                  setExpandedDates((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                              >
                                <div className="row-inline gap-sm align-center">
                                  <span className="folder-icon">{expandedDates.has(`${user.userName}-${date.date}`) ? "📂" : "📁"}</span>
                                  <strong>{date.date}</strong>
                                </div>
                                <FiChevronRight
                                  className={
                                    expandedDates.has(`${user.userName}-${date.date}`) ? "chevron chevron-open" : "chevron"
                                  }
                                />
                              </button>

                              {expandedDates.has(`${user.userName}-${date.date}`) ? (
                                <div className="table recordings-table borderless">
                                  <div className="table-row table-head">
                                    <div>Clip ID</div>
                                    <div>Time</div>
                                    <div>Actions</div>
                                  </div>
                                  {date.recordings.map((r) => (
                                    <div key={r.id} className="table-row borderless">
                                      <div className="muted small">{r.id}</div>
                                      <div>{r.time}</div>
                                      <div className="row-inline gap-xxs">
                                        {playingRecordingId === r.id ? (
                                          <Button label="Pause" variant="ghost" onClick={stopRecording} icon={<FiPause />} />
                                        ) : (
                                          <Button label="Play" variant="secondary" onClick={() => playRecording(r.id)} icon={<FiPlay />} />
                                        )}
                                        <Button label="Delete" variant="danger" onClick={() => deleteRecording(r.id)} icon={<FiTrash />} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))
                        : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (tab === "settings") {
        const membership = {
          type: "Premium",
          startDate: "2024-01-15",
          endDate: "2025-01-15",
        };

        const hostSettings = (
        <div className="stack gap-sm">
          <div className="settings-grid two-col">
            <div className="stack gap-sm">
              <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoStar />
                    <p className="muted strong">Membership</p>
                  </div>
                  <div className="row-inline between">
                    <div className="row-inline gap-sm">
                      <span className="pill">{membership.type}</span>
                    </div>
                    <span className="muted small row-inline gap-xxs">
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: "#22c55e",
                        }}
                      />
                      <span>Active</span>
                    </span>
                  </div>
                  <div className="row-inline between muted small">
                    <span className="row-inline gap-xxs">
                      <FiCalendar />
                      <span>Start: {formatDateShort(membership.startDate)}</span>
                    </span>
                    <span className="row-inline gap-xxs">
                      <FiCalendar />
                      <span>End: {formatDateShort(membership.endDate)}</span>
                    </span>
                  </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoPersonCircleOutline />
                    <p className="muted strong">Profile</p>
                  </div>
                  <div className="profile-row">
                    <div className="avatar-lg">
                      {session.avatarUrl ? <img src={session.avatarUrl} alt="avatar" /> : initials}
                    </div>
            <div className="stack gap-xxs">
                      <strong>{name}</strong>
                      <span className="muted small">{session.hostId}</span>
                    </div>
                    <Button label="Edit profile" variant="secondary" onClick={openEditProfileModal} />
                  </div>
                  <div className="info-row">
                    <div>
                      <span className="muted small">Host ID</span>
                      <div className="row-inline">
                        <strong>{session.hostId}</strong>
                        <button className="linklike" onClick={() => copyToClipboard(session.hostId || "")}>Copy</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoColorPaletteOutline />
                    <p className="muted strong">Appearance</p>
                  </div>
                  <div className="row-inline theme-buttons">
                    <Button
                      label="Light"
                      variant={theme === "light" ? "secondary" : "ghost"}
                      onClick={() => setTheme("light")}
                      icon={<FiSun />}
                    />
                    <Button
                      label="System"
                      variant={theme === "system" ? "secondary" : "ghost"}
                      onClick={() => setTheme("system")}
                      icon={<FiSmartphone />}
                    />
                    <Button
                      label="Dark"
                      variant={theme === "dark" ? "secondary" : "ghost"}
                      onClick={() => setTheme("dark")}
                      icon={<FiMoon />}
                    />
                  </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoLogOutOutline />
                    <p className="muted strong">Account</p>
                  </div>
                  <Button label="Log out" variant="danger" onClick={doLogout} />
                </div>
              </div>

              <div className="stack gap-sm">
                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoShieldCheckmarkOutline />
                    <p className="muted strong">Security</p>
                  </div>
                  <div className="row-inline">
                    <Button label="Change Password" variant="secondary" onClick={() => setShowChangePassword(true)} />
                  </div>
                  <p className="muted small">Secure your account with a new password.</p>
                  <div className="row-inline between">
                    <div className="stack gap-xxs">
                      <strong>Two-factor login</strong>
                      <span className="muted small">Send OTP when signing in.</span>
                    </div>
                    <ToggleSwitch checked={twoFactorEnabled} onToggle={handleToggleTwoFactor} />
                  </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoNotificationsOutline />
                    <p className="muted strong">Updates</p>
                  </div>
                  <div className="row-inline between">
                    <div className="stack gap-xxs">
                      <strong>App Notifications</strong>
                      <span className="muted small">Enable notifications for calls and updates.</span>
                    </div>
                    <ToggleSwitch checked={notificationsEnabled} onToggle={() => setNotificationsEnabled((v) => !v)} />
                  </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoLockClosedOutline />
                    <p className="muted strong">Privacy</p>
                  </div>
                  <div className="row-inline between">
                    <div className="stack gap-xxs">
                      <strong>Device Lock</strong>
                      <span className="muted small">
                        {biometricSupport?.available 
                          ? `Require ${biometricSupport.type === "touchid" ? "Touch ID" : "biometric"} or password when opening the app.`
                          : "Require password when opening the app."}
                      </span>
                      {biometricSupport?.available && (
                        <span className="muted small" style={{ color: "#22c55e" }}>
                          ✓ {biometricSupport.type === "touchid" ? "Touch ID" : "Biometric"} available
                        </span>
                      )}
                    </div>
                    <ToggleSwitch checked={deviceLockEnabled} onToggle={handleToggleDeviceLock} />
                  </div>
                  <div className="row-inline between">
                    <div className="stack gap-xxs">
                      <strong>One User, One Device</strong>
                      <span className="muted small">Restrict users to one device at a time. New logins require approval.</span>
                    </div>
                    <ToggleSwitch checked={oneDeviceOnly} onToggle={handleToggleUserSingleDevice} />
                  </div>
                  <div className="row-inline between">
                    <div className="stack gap-xxs">
                      <strong>Concurrent Sessions</strong>
                      <span className="muted small">Allow multiple logins per user.</span>
                    </div>
                    <ToggleSwitch checked={allowMultipleSessions} onToggle={handleToggleMultipleSessions} />
                  </div>
                <div className="row-inline between">
                  <div className="stack gap-xxs">
                    <strong>Logged-in Devices</strong>
                    <span className="muted small">View and log out active devices.</span>
                  </div>
                  <button className="linklike" onClick={openSessions}>View devices</button>
                </div>
                </div>

                <div className="card stack gap-sm">
                  <div className="row-inline gap-xxs align-center">
                    <IoInformationCircleOutline />
                    <p className="muted strong">App Information</p>
                  </div>
                  <div className="info-row">
                    <div>
                      <span className="muted small">Version</span>
                      <strong>1.0.0</strong>
                    </div>
                    <div>
                      <span className="muted small">Role</span>
                      <strong>Host</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        const userSettings = (
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
                    {session.role === "user" ? (
                  <div>
                    <span className="muted small">Password</span>
                    <div className="row-inline">
                          <strong>{session.password || "Not available"}</strong>
                      <button
                        className="linklike"
                        onClick={() => session.password && copyToClipboard(session.password)}
                        disabled={!session.password}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                    ) : null}
                </div>
              </div>

              <div className="card stack gap-sm">
                <p className="muted strong">Call background</p>
                <div className="image-grid">
                  {[
                      logo360,
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

        return session.role === "host" ? hostSettings : userSettings;
      }
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
                <img src={logoBlack} alt="MizCall logo light" className="logo-light" />
                <img src={logoWhite} alt="MizCall logo dark" className="logo-dark" />
              </div>
              <img src={logo360} alt="MizCall logo" className="logo-collapsed" />
            </div>
            <button className="collapse-btn" onClick={() => setSidebarCollapsed((c) => !c)}>
              {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </button>
          </div>
          <nav className="sidebar__nav">
            {(() => {
              const base: Array<{ key: NavTab; icon: string; label: string }> =
                session.role === "host"
                  ? [
                      { key: "dashboard", icon: iconHome, label: "Dashboard" },
                      { key: "users", icon: iconUsers, label: "Users" },
                      { key: "calls", icon: iconCalls, label: "Calls" },
                      { key: "recordings", icon: iconRecordings, label: "Recordings" },
                      { key: "settings", icon: iconSettings, label: "Settings" },
                    ]
                  : [
                      { key: "dashboard", icon: iconHome, label: "Dashboard" },
                      { key: "recordings", icon: iconRecordings, label: "Recordings" },
                      { key: "settings", icon: iconSettings, label: "Settings" },
                    ];
              return base.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${tab === item.key ? "active" : ""}`}
                  onClick={() => setTab(item.key)}
                  title={item.label}
                >
                  <span className="nav-icon nav-icon-img-wrapper">
                    <img
                      src={item.icon}
                      alt={item.label}
                      className={`nav-icon-img-src ${effectiveTheme === "dark" ? "nav-icon-img-dark" : "nav-icon-img-light"}`}
                    />
                  </span>
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
            <div className="pane-actions">
              <button
                className="icon-btn"
                onClick={toggleTheme}
                title={`Switch to ${effectiveTheme === "dark" ? "light" : "dark"} mode`}
              >
                {effectiveTheme === "dark" ? <FiSun /> : <FiMoon />}
              </button>
              <div
                className={`icon-btn ${networkStatus === "online" ? "status-ok" : "status-bad"}`}
                title={networkStatus === "online" ? "Connected" : "Disconnected"}
              >
                {networkStatus === "online" ? <FiWifi /> : <FiWifiOff />}
              </div>
            </div>
          </div>
          <div className="content">{renderContent()}</div>
        </section>
      </div>
    );
  };

  return (
    <div className="app">
      <main className={`main ${session ? "main-app" : "main-auth"}`}>
        {session && !showDeviceLockAuth ? (
          renderAppShell()
        ) : !session ? (
          renderAuthShell()
        ) : null}
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

      {sessionsVisible ? (
        <div className="modal-backdrop" onClick={() => setSessionsVisible(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header between">
              <p className="muted strong">Logged-in devices</p>
              <button className="icon-btn" onClick={() => setSessionsVisible(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body stack gap-sm" style={{ maxHeight: 400, overflowY: "auto" }}>
              {sessionsLoading ? (
                <p className="muted">Loading...</p>
              ) : sessions.length === 0 ? (
                <p className="muted">No active devices.</p>
              ) : (
                sessions.map((s) => {
                  const nameText = s.deviceName || s.deviceLabel || "Unknown device";
                  const modelText = s.modelName ? ` (${s.modelName})` : "";
                  const platformText = s.platform || "";
                  const ua = (s.userAgent || "").toLowerCase();
                  const haystack = `${platformText} ${nameText} ${modelText} ${ua}`.toLowerCase();
                  const isAndroid = haystack.includes("android") || haystack.includes("sm-") || ua.includes("okhttp");
                  const isApple = haystack.includes("ios") || haystack.includes("mac") || haystack.includes("iphone") || haystack.includes("ipad") || haystack.includes("apple");
                  const isWindows = haystack.includes("windows") || haystack.includes("win32");
                  const isLinux = haystack.includes("linux") || haystack.includes("ubuntu");
                  const platformIcon = isAndroid
                    ? platformIconAndroid
                    : isApple
                    ? platformIconApple
                    : isWindows
                    ? platformIconMenu
                    : isLinux
                    ? platformIconLinux
                    : platformIconMenu;
                  const isCurrent = s.isCurrent;
                  return (
                    <div key={s.id} className="card stack gap-xxs">
                      <div className="row-inline gap-xxs align-center">
                        <img src={platformIcon} alt="" style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.7 }} />
                        <strong>
                          <span className="muted small">{platformText ? `${platformText} • ` : ""}</span>
                          {nameText}
                          {modelText}
                          {isCurrent ? <span style={{ marginLeft: 6, color: "#2563eb" }}>(Current device)</span> : null}
                        </strong>
                      </div>
                      <span className="muted small">
                        Last active: {s.lastSeenAt ? formatDateShort(s.lastSeenAt) : "—"}
                      </span>
                      <div className="row-inline between">
                        <span className="muted small">
                          Last seen: {s.lastSeenAt ? formatDateShort(s.lastSeenAt) : "—"}
                        </span>
                        <Button label={isCurrent ? "Current device" : "Log out device"} variant="danger" onClick={() => revokeSession(s.id)} disabled={isCurrent} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="modal-actions">
              <Button label="Refresh" variant="secondary" onClick={loadSessions} loading={sessionsLoading} />
              <Button label="Close" variant="ghost" onClick={() => setSessionsVisible(false)} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Create User Modal */}
      {showCreateUser ? (
        <div className="modal-backdrop" onClick={() => { setShowCreateUser(false); setCreateEnforceSingleDevice(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Create New User</p>
            </div>
            <div className="modal-body stack gap-sm">
              <Input label="Username" value={createUsername} onChange={setCreateUsername} placeholder="username" />
              <Input label="Password (optional)" value={createPassword} onChange={setCreatePassword} placeholder="auto-generate if empty" />
              
              <div className="stack gap-xxs">
                <label className="muted strong small">One Device Only</label>
                <p className="muted small">Control device restriction for this user</p>
                <div className="row-inline gap-sm">
                  <button
                    className={`btn ${createEnforceSingleDevice === null ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCreateEnforceSingleDevice(null)}
                  >
                    Inherit
                  </button>
                  <button
                    className={`btn ${createEnforceSingleDevice === true ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCreateEnforceSingleDevice(true)}
                  >
                    Force
                  </button>
                  <button
                    className={`btn ${createEnforceSingleDevice === false ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCreateEnforceSingleDevice(false)}
                  >
                    Allow
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <Button label="Cancel" variant="ghost" onClick={() => { setShowCreateUser(false); setCreateEnforceSingleDevice(null); }} />
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
              
              <div className="stack gap-xxs">
                <label className="muted strong small">One Device Only</label>
                <p className="muted small">Control device restriction for this user</p>
                <div className="row-inline gap-sm">
                  <button
                    className={`btn ${editEnforceSingleDevice === null ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEditEnforceSingleDevice(null)}
                  >
                    Inherit
                  </button>
                  <button
                    className={`btn ${editEnforceSingleDevice === true ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEditEnforceSingleDevice(true)}
                  >
                    Force
                  </button>
                  <button
                    className={`btn ${editEnforceSingleDevice === false ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEditEnforceSingleDevice(false)}
                  >
                    Allow
                  </button>
                </div>
              </div>
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
              <Button 
                label="Manage Sessions" 
                variant="secondary" 
                onClick={() => {
                  setShowViewUser(false);
                  setShowUserSessions(true);
                  if (viewUser) {
                    loadUserSessions(viewUser.id);
                  }
                }} 
              />
              <Button label="Close" variant="ghost" onClick={() => setShowViewUser(false)} />
            </div>
          </div>
        </div>
      ) : null}

      {/* User Sessions Modal */}
      {showUserSessions && viewUser ? (
        <div className="modal-backdrop" onClick={() => setShowUserSessions(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="muted strong">User Sessions</p>
                <p className="muted small">{viewUser.username} ({viewUser.id})</p>
              </div>
              <button className="linklike" onClick={() => loadUserSessions(viewUser.id)} disabled={userSessionsLoading}>
                Refresh
              </button>
            </div>
            <div className="modal-body stack gap-sm">
              {userSessionsLoading ? (
                <p className="muted">Loading sessions...</p>
              ) : (
                <>
                  {/* Pending Requests */}
                  {userSessionRequests.length > 0 && (
                    <div className="card stack gap-sm" style={{ borderColor: "#f59e0b", borderWidth: 2 }}>
                      <p className="muted strong">⏳ Pending Requests ({userSessionRequests.length})</p>
                      {userSessionRequests.map((req) => (
                        <div key={req.id} className="card subtle stack gap-xxs">
                          <div className="row-inline between">
                            <div className="stack gap-xxs">
                              <strong>{req.deviceLabel}</strong>
                              <span className="muted small">{req.platform || "Unknown"}</span>
                              <span className="muted small">Requested: {formatDateTime(req.requestedAt)}</span>
                            </div>
                            <div className="row-inline gap-sm">
                              <Button 
                                label="Approve" 
                                variant="primary" 
                                onClick={() => {
                                  if (confirm("This will revoke all existing sessions. Continue?")) {
                                    approveUserSession(viewUser.id, req.id);
                                  }
                                }} 
                              />
                              <Button 
                                label="Reject" 
                                variant="danger" 
                                onClick={() => {
                                  if (confirm("Reject this session request?")) {
                                    rejectUserSession(viewUser.id, req.id);
                                  }
                                }} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Sessions */}
                  <div className="card stack gap-sm">
                    <p className="muted strong">📱 Active Sessions ({userSessions.length})</p>
                    {userSessions.length === 0 ? (
                      <p className="muted small">No active sessions</p>
                    ) : (
                      userSessions.map((sess) => (
                        <div key={sess.id} className="card subtle stack gap-xxs">
                          <div className="row-inline between">
                            <div className="stack gap-xxs">
                              <strong>{sess.deviceLabel || sess.deviceName || "Unknown Device"}</strong>
                              <span className="muted small">{sess.platform || "Unknown"}</span>
                              <span className="muted small">Created: {formatDateTime(sess.createdAt || null)}</span>
                              {sess.lastSeenAt && (
                                <span className="muted small">Last seen: {formatDateTime(sess.lastSeenAt)}</span>
                              )}
                            </div>
                            <Button 
                              label="Revoke" 
                              variant="danger" 
                              onClick={() => {
                                if (confirm(`Log out ${sess.deviceLabel || "this device"}?`)) {
                                  revokeUserSession(viewUser.id, sess.id);
                                }
                              }} 
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="card subtle stack gap-xxs">
                    <p className="muted small">
                      <strong>ℹ️ Note:</strong> When "One User, One Device" is enabled, users can only be logged in on one device. 
                      New login attempts require host approval.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <Button label="Close" variant="ghost" onClick={() => setShowUserSessions(false)} />
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
              {pwError ? <p className="error">{pwError}</p> : null}
              <Input label="Current Password" type="password" value={pwCurrent} onChange={setPwCurrent} placeholder="Enter current password" />
              <Input label="New Password" type="password" value={pwNew} onChange={setPwNew} placeholder="Enter new password" />
              <Input label="Confirm Password" type="password" value={pwConfirm} onChange={setPwConfirm} placeholder="Confirm new password" />
              <p className="muted small">Password must be at least 6 characters.</p>
            </div>
            <div className="modal-actions">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  setShowChangePassword(false);
                  setPwCurrent("");
                  setPwNew("");
                  setPwConfirm("");
                  setPwError(null);
                }}
              />
              <Button label={pwLoading ? "Updating..." : "Save"} onClick={handleChangePasswordSubmit} disabled={pwLoading} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Device Lock Enable Prompt Modal */}
      {showDeviceLockPrompt ? (
        <div className="modal-backdrop" onClick={() => setShowDeviceLockPrompt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Enable Device Lock</p>
            </div>
            <div className="modal-body stack gap-sm">
              <p className="muted small">
                Verify your identity to enable device lock. 
                You'll need to authenticate when opening the app.
              </p>
              {deviceLockError ? <p className="error">{deviceLockError}</p> : null}
              <div onKeyDown={(e) => {
                if (e.key === "Enter" && deviceLockPassword.trim()) {
                  handleEnableDeviceLock();
                }
              }}>
                <Input 
                  label="Your Password" 
                  type="password" 
                  value={deviceLockPassword} 
                  onChange={setDeviceLockPassword} 
                  placeholder="Enter your password" 
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  setShowDeviceLockPrompt(false);
                  setDeviceLockPassword("");
                  setDeviceLockError(null);
                }}
              />
              <Button 
                label="Enable" 
                onClick={handleEnableDeviceLock}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Device Lock Authentication Modal (shown on app startup) */}
      {showDeviceLockAuth && session ? (
        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">🔒 Device Locked</p>
            </div>
            <div className="modal-body stack gap-sm">
              {biometricSupport?.available ? (
                <>
                  <p className="muted small">
                    Use {biometricSupport.type === "touchid" ? "Touch ID" : "biometric authentication"} or enter your password to unlock
                  </p>
                  <p className="muted small"><strong>Logged in as:</strong> {session.name || session.hostId || session.userId}</p>
                  {deviceLockError ? <p className="error">{deviceLockError}</p> : null}
                  
                  <Button
                    label={`Use ${biometricSupport.type === "touchid" ? "Touch ID" : "Biometric"}`}
                    variant="primary"
                    onClick={handleDeviceLockAuthWithBiometric}
                    icon={<span>🔐</span>}
                  />
                  
                  <div className="divider-text">
                    <span className="muted small">or</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted small">Enter your password to unlock the app</p>
                  <p className="muted small"><strong>Logged in as:</strong> {session.name || session.hostId || session.userId}</p>
                  {deviceLockError ? <p className="error">{deviceLockError}</p> : null}
                </>
              )}
              
              <div onKeyDown={(e) => {
                if (e.key === "Enter" && deviceLockAuthPassword.trim()) {
                  handleDeviceLockAuthWithPassword();
                }
              }}>
                <Input 
                  label="Password" 
                  type="password" 
                  value={deviceLockAuthPassword} 
                  onChange={setDeviceLockAuthPassword} 
                  placeholder="Enter your password" 
                  autoFocus={!biometricSupport?.available}
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button
                label="Log Out"
                variant="danger"
                onClick={() => {
                  setShowDeviceLockAuth(false);
                  doLogout();
                }}
              />
              <Button 
                label={biometricSupport?.available ? "Unlock with Password" : "Unlock"} 
                onClick={handleDeviceLockAuthWithPassword}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Profile Modal */}
      {showEditProfile ? (
        <div className="modal-backdrop" onClick={() => setShowEditProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="muted strong">Edit Profile</p>
            </div>
            <div className="modal-body stack gap-sm">
              {editProfileError ? <p className="error">{editProfileError}</p> : null}
              {(() => {
                const base = editProfileName || session?.name || "H";
                const modalInitials = base.slice(0, 2).toUpperCase();
                return (
              <div className="profile-row">
                <div className="avatar-lg">
                  {session?.avatarUrl ? <img src={session.avatarUrl} alt="avatar" /> : modalInitials}
                </div>
                <Button label="Change photo" variant="ghost" onClick={handleAvatarClick} />
              </div>
                );
              })()}
                      <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarFile}
              />
              <Input label="Full Name" value={editProfileName} onChange={setEditProfileName} placeholder="Enter full name" />
              <Input label="Email" value={editProfileEmail} onChange={setEditProfileEmail} placeholder="host@example.com" />
            </div>
            <div className="modal-actions">
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => {
                  setShowEditProfile(false);
                  setEditProfileError(null);
                }}
              />
              <Button label={editProfileLoading ? "Saving..." : "Save"} onClick={handleSaveProfile} disabled={editProfileLoading} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

