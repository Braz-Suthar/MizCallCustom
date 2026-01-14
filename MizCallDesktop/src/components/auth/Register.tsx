import { useState, useEffect, useRef } from "react";
import { Button, Input } from "../common";
import { logoWhite } from "../../constants";
import { handleOtpDigitChange, handleOtpKeyDown, handleOtpPaste } from "../../utils/otp";

interface RegisterProps {
  goLogin: () => void;
  onBack: () => void;
}

export const Register = ({ goLogin, onBack }: RegisterProps) => {
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
              <button className="linklike" onClick={() => setVerifying(false)}>
                Edit details
              </button>
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
                  onChange={(e) => handleOtpDigitChange(i, e.target.value, setOtp, otpRefs)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i, otp, setOtp, otpRefs)}
                  onPaste={(e) => handleOtpPaste(e, setOtp, otpRefs)}
                />
              ))}
            </div>
            <div className="full-width">
              <Button label="Verify" onClick={onVerify} />
            </div>
            <div className="resend-row">
              <span className="muted small">Didn't receive the code?</span>
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
              Join thousands of businesses that trust MizCall for their video communication needs. Get started with our
              easy setup process.
            </p>
            <ul className="hero-list">
              <li>
                <span className="tick">✓</span> Easy team management
              </li>
              <li>
                <span className="tick">✓</span> Flexible pricing plans
              </li>
              <li>
                <span className="tick">✓</span> Dedicated support
              </li>
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
              Already have an account?{" "}
              <button className="linklike" onClick={goLogin}>
                Login
              </button>
            </p>
          </div>

          <Input label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" autoFocus />

          <Input label="Email Address" value={email} onChange={setEmail} placeholder="host@example.com" />

          <Input label="Password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" type="password" />

          <Input label="Confirm Password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" type="password" />

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
            Join thousands of businesses that trust MizCall for their video communication needs. Get started with our
            easy setup process.
          </p>
          <ul className="hero-list">
            <li>
              <span className="tick">✓</span> Easy team management
            </li>
            <li>
              <span className="tick">✓</span> Flexible pricing plans
            </li>
            <li>
              <span className="tick">✓</span> Dedicated support
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
