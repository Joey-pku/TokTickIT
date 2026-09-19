import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext.js";
import { ApiCallError } from "./api.js";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {

    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await login(email, password);
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
            <path d="M12 5v7l4 2M7 13l3 3 7-7"/>
          </svg>
        </div>
        <h1 className="zen-auth-title">TokTickIT</h1>
        <p className="zen-auth-subtitle">IT Service Desk — Sign in to continue</p>

        {error && (
          <div className="zen-alert zen-alert-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="zen-form-group">
            <label htmlFor="login-email" className="zen-label">Email address</label>
            <input
              id="login-email"
              type="email"
              className={`zen-input${fieldErrors.email ? " zen-input-error" : ""}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
            {fieldErrors.email && <p className="zen-field-error" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className="zen-form-group">
            <label htmlFor="login-password" className="zen-label">Password</label>
            <div className="zen-password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`zen-input${fieldErrors.password ? " zen-input-error" : ""}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button type="button" className="zen-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={loading}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && <p className="zen-field-error" role="alert">{fieldErrors.password}</p>}
          </div>

          <button
            id="login-submit"
            type="submit"
            className="zen-btn zen-btn-primary zen-btn-full"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
