import { useState, useRef, useEffect, type FormEvent } from "react";
import { useAuth } from "./AuthContext.js";
import { ApiCallError } from "./api.js";

export function ChangePasswordPage() {
  const { changePassword, logout, user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const checks = {
    length: Array.from(next).length >= 8,
    bytes: new TextEncoder().encode(next).length <= 72,
    upper: /[A-Z]/.test(next),
    lower: /[a-z]/.test(next),
    digit: /\d/.test(next),
    symbol: /[^a-zA-Z0-9\s]/.test(next),
    different: next.length > 0 && next !== current,
    matches: next.length > 0 && next === confirm,
  };
  const ready = Object.values(checks).every(Boolean);

  useEffect(() => { currentRef.current?.focus(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await changePassword(current, next, confirm);
    } catch (err) {
      if (err instanceof ApiCallError) {
        if (err.error.fields) setFieldErrors(err.error.fields);
        else setError(err.error.message);
      } else {
        setError("Unable to connect. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zen-auth-backdrop">
      <div className="zen-auth-card" role="main">
        <div className="zen-auth-logo" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4m0 4h.01"/>
          </svg>
        </div>
        <h1 className="zen-auth-title">Change Password</h1>
        <p className="zen-auth-subtitle">
          {user?.name ? `Welcome, ${user.name}. ` : ""}
          You must set a new password before continuing.
        </p>

        {error && (
          <div className="zen-alert zen-alert-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="zen-form-group">
            <label htmlFor="cp-current" className="zen-label">Current password</label>
            <input
              id="cp-current"
              ref={currentRef}
              type="password"
              className={`zen-input${fieldErrors.currentPassword ? " zen-input-error" : ""}`}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
            {fieldErrors.currentPassword && <p className="zen-field-error" role="alert">{fieldErrors.currentPassword}</p>}
          </div>

          <div className="zen-form-group">
            <label htmlFor="cp-new" className="zen-label">New password</label>
            <input
              id="cp-new"
              type="password"
              className={`zen-input${fieldErrors.newPassword ? " zen-input-error" : ""}`}
              value={next}
              onChange={e => setNext(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
            {fieldErrors.newPassword && <p className="zen-field-error" role="alert">{fieldErrors.newPassword}</p>}
            <ul className="zen-password-checklist" aria-label="Password requirements">
              <li className={checks.length ? "is-valid" : ""}>At least 8 Unicode characters</li>
              <li className={checks.bytes ? "is-valid" : ""}>At most 72 UTF-8 bytes</li>
              <li className={checks.upper && checks.lower ? "is-valid" : ""}>Uppercase and lowercase letters</li>
              <li className={checks.digit ? "is-valid" : ""}>At least one number</li>
              <li className={checks.symbol ? "is-valid" : ""}>At least one symbol</li>
              <li className={checks.different ? "is-valid" : ""}>Different from current password</li>
              <li className={checks.matches ? "is-valid" : ""}>Confirmation matches</li>
            </ul>
          </div>

          <div className="zen-form-group">
            <label htmlFor="cp-confirm" className="zen-label">Confirm new password</label>
            <input
              id="cp-confirm"
              type="password"
              className={`zen-input${fieldErrors.confirmPassword ? " zen-input-error" : ""}`}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
            {fieldErrors.confirmPassword && <p className="zen-field-error" role="alert">{fieldErrors.confirmPassword}</p>}
          </div>

          <button
            id="cp-submit"
            type="submit"
            className="zen-btn zen-btn-primary zen-btn-full"
            disabled={loading || !ready}
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
          <button type="button" className="zen-btn zen-btn-secondary zen-btn-full" onClick={() => void logout()} disabled={loading}>Sign out</button>
        </form>
      </div>
    </div>
  );
}
