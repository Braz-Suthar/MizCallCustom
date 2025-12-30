import { type ReactNode, useMemo, useState } from "react";

type Screen = "welcome" | "login" | "register";
type Mode = "host" | "user";

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

const Segmented = ({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (v: Mode) => void;
}) => (
  <div className="segmented">
    {(["host", "user"] as Mode[]).map((m) => (
      <button
        key={m}
        className={`segmented__item ${value === m ? "is-active" : ""}`}
        onClick={() => onChange(m)}
      >
        {m === "host" ? "Host" : "User"}
      </button>
    ))}
  </div>
);

const Welcome = ({ goLogin, goRegister }: { goLogin: () => void; goRegister: () => void }) => (
  <div className="card center gap-lg">
    <div className="logo-circle">MC</div>
    <div className="stack gap-xs">
      <h1 className="title">Welcome to MizCall</h1>
      <p className="muted">Fast, secure calls and recordings with an iOS-polished feel.</p>
    </div>
    <div className="stack gap-sm w-full">
      <Button label="Log in" onClick={goLogin} />
      <Button label="Create account" variant="secondary" onClick={goRegister} />
    </div>
  </div>
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
  onSubmit: (payload: { mode: Mode; email: string; userId: string; password: string }) => void;
  loading: boolean;
  error: string | null;
}) => {
  const [mode, setMode] = useState<Mode>("host");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const disable = useMemo(
    () =>
      !password.trim() ||
      (mode === "host" ? !email.trim() : !userId.trim()),
    [email, password, userId, mode],
  );

  return (
    <div className="card stack gap-md">
      <div className="stack gap-xxs">
        <p className="muted">Sign in</p>
        <h2 className="title">Choose your role to continue</h2>
      </div>

      <Segmented value={mode} onChange={setMode} />

      {mode === "host" ? (
        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="host@example.com"
          autoFocus
        />
      ) : (
        <Input
          label="User ID"
          value={userId}
          onChange={setUserId}
          placeholder="U123456"
          autoFocus
        />
      )}

      <Input
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        type="password"
      />

      {error ? <p className="error">{error}</p> : null}

      <Button
        label={loading ? "Signing in…" : "Continue"}
        disabled={disable || loading}
        onClick={() => onSubmit({ mode, email, userId, password })}
      />

      <div className="stack center gap-xxs">
        <p className="muted">Need an account? Register to get started.</p>
        <Button label="Create account" variant="ghost" onClick={goRegister} />
      </div>

      <div className="stack center gap-xxs">
        <Button label="Back" variant="ghost" onClick={onBack} />
      </div>
    </div>
  );
};

const Register = ({ goLogin, onBack }: { goLogin: () => void; onBack: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const disable = !email.trim() || password.trim().length < 6;

  return (
    <div className="card stack gap-md">
      <div className="stack gap-xxs">
        <p className="muted">Create account</p>
        <h2 className="title">Hosts register with email and password.</h2>
      </div>

      <Input
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoFocus
      />
      <Input
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Minimum 6 characters"
        type="password"
      />

      <Button label="Create account" disabled={disable} onClick={() => {}} />

      <div className="stack center gap-xxs">
        <p className="muted">Already have an account?</p>
        <Button label="Back to login" variant="ghost" onClick={goLogin} />
        <Button label="Back" variant="ghost" onClick={onBack} />
      </div>
    </div>
  );
};

function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    role: Mode;
    token: string;
    hostId?: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
  } | null>(null);

  const doLogin = async (payload: { mode: Mode; email: string; userId: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.mizcall) {
        throw new Error("Desktop bridge not loaded. Launch via `npm run dev` (Electron), not the browser.");
      }
      if (payload.mode === "host") {
        const data = await window.mizcall?.loginHost?.(payload.email, payload.password);
        if (!data) throw new Error("Bridge unavailable");
        setSession({
          role: "host",
          token: data.token,
          hostId: data.hostId,
          name: data.name ?? payload.email,
          avatarUrl: data.avatarUrl,
        });
        setScreen("welcome");
      } else {
        const data = await window.mizcall?.loginUser?.(payload.userId, payload.password);
        if (!data) throw new Error("Bridge unavailable");
        setSession({
          role: "user",
          token: data.token,
          userId: payload.userId,
          hostId: data.hostId,
          name: data.name ?? payload.userId,
          avatarUrl: data.avatarUrl,
        });
        setScreen("welcome");
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
    setScreen("welcome");
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>MizCall Desktop</h1>
          <p className="muted">Electron + React shell. UI mirrors the Expo auth flow.</p>
        </div>
        <div className="stack gap-xxs">
          <Pill>env: {window.mizcall?.env ?? "prod"}</Pill>
          <Pill>api: custom.mizcall.com</Pill>
        </div>
      </header>

      <main className="main">
        {session ? (
          <div className="card stack gap-sm">
            <p className="muted">Session</p>
            <div className="stack gap-xxs">
              <strong>{session.role === "host" ? "Host" : "User"} session active</strong>
              <span className="muted">
                {session.role === "host" ? `Host ID: ${session.hostId ?? "—"}` : `User ID: ${session.userId ?? "—"}`}
              </span>
              <span className="muted">Token: {session.token.slice(0, 10)}…</span>
              {session.hostId ? <span className="muted">Linked host: {session.hostId}</span> : null}
            </div>
            <Button label="Log out" variant="ghost" onClick={doLogout} />
          </div>
        ) : null}

        {screen === "welcome" && (
          <Welcome goLogin={() => setScreen("login")} goRegister={() => setScreen("register")} />
        )}
        {screen === "login" && (
          <Login
            goRegister={() => setScreen("register")}
            onBack={() => setScreen("welcome")}
            onSubmit={doLogin}
            loading={loading}
            error={error}
          />
        )}
        {screen === "register" && (
          <Register
            goLogin={() => setScreen("login")}
            onBack={() => setScreen("welcome")}
          />
        )}
      </main>
    </div>
  );
}

export default App;

