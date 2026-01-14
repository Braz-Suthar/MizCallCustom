import { useState, useMemo } from "react";
import { Button, Input } from "../common";
import { logoWhite } from "../../constants";

interface LoginProps {
  goRegister: () => void;
  onBack: () => void;
  onSubmit: (payload: { identifier: string; password: string }) => void;
  loading: boolean;
  error: string | null;
  onForgot: () => void;
}

export const Login = ({
  goRegister,
  onBack,
  onSubmit,
  loading,
  error,
  onForgot,
}: LoginProps) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const disable = useMemo(
    () => !password.trim() || !identifier.trim(),
    [identifier, password]
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
              Or{" "}
              <button className="linklike" onClick={goRegister}>
                create a new account
              </button>
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
            <button className="linklike" onClick={onForgot}>
              Forgot your password?
            </button>
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
            <li>
              <span className="tick">✓</span> High-quality video and audio
            </li>
            <li>
              <span className="tick">✓</span> Screen sharing and collaboration
            </li>
            <li>
              <span className="tick">✓</span> Secure and reliable connection
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
