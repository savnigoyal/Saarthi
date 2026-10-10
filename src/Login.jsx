import { useState, useId, useReducer } from "react";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import "./Login.css";

function MapPreview() {
  return (
    <div className="lp-map" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp-map__svg">
        <line x1="0" y1="50"  x2="320" y2="50"  stroke="#2a3c42" strokeWidth="1"/>
        <line x1="0" y1="100" x2="320" y2="100" stroke="#2a3c42" strokeWidth="1"/>
        <line x1="0" y1="150" x2="320" y2="150" stroke="#2a3c42" strokeWidth="1"/>
        <line x1="80"  y1="0" x2="80"  y2="200" stroke="#2a3c42" strokeWidth="1"/>
        <line x1="160" y1="0" x2="160" y2="200" stroke="#2a3c42" strokeWidth="1"/>
        <line x1="240" y1="0" x2="240" y2="200" stroke="#2a3c42" strokeWidth="1"/>
        <line x1="0" y1="75"  x2="160" y2="75"  stroke="#243036" strokeWidth="0.6"/>
        <line x1="160" y1="125" x2="320" y2="125" stroke="#243036" strokeWidth="0.6"/>
        <line x1="120" y1="0"  x2="120" y2="100" stroke="#243036" strokeWidth="0.6"/>
        <line x1="200" y1="100" x2="200" y2="200" stroke="#243036" strokeWidth="0.6"/>
        <path d="M 44 170 L 44 100 L 160 100 L 160 50 L 276 50" stroke="#247C73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 44 100 L 120 100 L 120 50 L 160 50" stroke="#1a5750" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" opacity="0.6"/>
        <circle cx="44" cy="170" r="7" fill="#17252B" stroke="#247C73" strokeWidth="2"/>
        <circle cx="44" cy="170" r="3" fill="#247C73"/>
        <circle cx="276" cy="50" r="7" fill="#17252B" stroke="#5BA89E" strokeWidth="2"/>
        <rect x="272" y="41" width="8" height="9" rx="1" fill="#5BA89E" opacity="0.9"/>
        <circle cx="276" cy="50" r="1.5" fill="#17252B"/>
        <rect x="116" y="96" width="8" height="8" rx="1.5" fill="#1e4a46" stroke="#247C73" strokeWidth="1.2"/>
        <rect x="156" y="46" width="8" height="8" rx="1.5" fill="#1e4a46" stroke="#247C73" strokeWidth="1.2"/>
        <rect x="82" y="86" width="38" height="13" rx="3" fill="#0f1e23" opacity="0.85"/>
        <text x="101" y="96" fill="#5BA89E" fontSize="7" fontFamily="system-ui,sans-serif" textAnchor="middle" fontWeight="600">2.4 km</text>
        <text x="158" y="93" fill="#3a5056" fontSize="6" fontFamily="system-ui,sans-serif" textAnchor="middle" transform="rotate(-90,158,93)">MI Road</text>
        <text x="44" y="138" fill="#3a5056" fontSize="6" fontFamily="system-ui,sans-serif" textAnchor="middle" transform="rotate(-90,44,138)">JLN Marg</text>
      </svg>
      <div className="lp-map__labels">
        <span className="lp-map__label lp-map__label--origin">Start</span>
        <span className="lp-map__label lp-map__label--dest">Destination</span>
      </div>
    </div>
  );
}

const initialState = {
  email: "",
  password: "",
  showPassword: false,
  touched: { email: false, password: false },
  submitting: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "TOUCH":
      return { ...state, touched: { ...state.touched, [action.field]: true } };
    case "TOGGLE_PASSWORD":
      return { ...state, showPassword: !state.showPassword };
    case "SUBMIT_START":
      return { ...state, submitting: true, error: null };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, error: action.message };
    case "SUBMIT_SUCCESS":
      return { ...state, submitting: false };
    default:
      return state;
  }
}

function validateEmail(v) {
  if (!v) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  return null;
}

function validatePassword(v) {
  if (!v) return "Password is required.";
  if (v.length < 6) return "Password must be at least 6 characters.";
  return null;
}

export default function Login({ onNavigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const emailId = useId();
  const passwordId = useId();

  const emailError   = state.touched.email    ? validateEmail(state.email)       : null;
  const passwordError = state.touched.password ? validatePassword(state.password) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: "TOUCH", field: "email" });
    dispatch({ type: "TOUCH", field: "password" });
    if (validateEmail(state.email) || validatePassword(state.password)) return;
    dispatch({ type: "SUBMIT_START" });
    await new Promise(r => setTimeout(r, 900));
    dispatch({
      type: "SUBMIT_ERROR",
      message: "Authentication is not configured yet. Connect Supabase or another auth provider to enable sign-in.",
    });
  }

  return (
    <div className="lp-root">
      <aside className="lp-left">
        <div className="lp-left__inner">
          <div className="lp-wordmark">
            <span className="lp-wordmark__dot" aria-hidden="true"/>
            <span className="lp-wordmark__text">Saarthi++</span>
          </div>
          <div className="lp-hero">
            <h1 className="lp-hero__headline">A safer way<br/>to get home.</h1>
            <p className="lp-hero__body">
              Plan your journey, stay aware of your route, and keep the people you trust informed.
            </p>
          </div>
          <MapPreview />
          <div className="lp-status">
            <span className="lp-status__dot" aria-hidden="true"/>
            <span>Your trusted circle, within reach.</span>
          </div>
        </div>
      </aside>

      <main className="lp-right">
        <div className="lp-form-wrap">
          <div className="lp-wordmark lp-wordmark--mobile">
            <span className="lp-wordmark__dot" aria-hidden="true"/>
            <span className="lp-wordmark__text">Saarthi++</span>
          </div>

          <div className="lp-form-head">
            <h2 className="lp-form-head__title">Welcome back</h2>
            <p className="lp-form-head__sub">Sign in to continue to your account.</p>
          </div>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            <div className="lp-field">
              <label htmlFor={emailId} className="lp-label">Email address</label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                className={"lp-input" + (emailError ? " lp-input--error" : "")}
                value={state.email}
                onChange={e => dispatch({ type: "SET_FIELD", field: "email", value: e.target.value })}
                onBlur={() => dispatch({ type: "TOUCH", field: "email" })}
                aria-describedby={emailError ? emailId + "-err" : undefined}
                aria-invalid={!!emailError}
                disabled={state.submitting}
                placeholder="you@example.com"
              />
              {emailError && (
                <span id={emailId + "-err"} className="lp-field-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true"/>
                  {emailError}
                </span>
              )}
            </div>

            <div className="lp-field">
              <div className="lp-label-row">
                <label htmlFor={passwordId} className="lp-label">Password</label>
                <button type="button" className="lp-forgot" tabIndex={0}
                  onClick={() => alert("Password reset — connect an auth provider first.")}>
                  Forgot password?
                </button>
              </div>
              <div className="lp-input-wrap">
                <input
                  id={passwordId}
                  type={state.showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={"lp-input lp-input--with-icon" + (passwordError ? " lp-input--error" : "")}
                  value={state.password}
                  onChange={e => dispatch({ type: "SET_FIELD", field: "password", value: e.target.value })}
                  onBlur={() => dispatch({ type: "TOUCH", field: "password" })}
                  aria-describedby={passwordError ? passwordId + "-err" : undefined}
                  aria-invalid={!!passwordError}
                  disabled={state.submitting}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="lp-input__reveal"
                  onClick={() => dispatch({ type: "TOGGLE_PASSWORD" })}
                  aria-label={state.showPassword ? "Hide password" : "Show password"}
                >
                  {state.showPassword
                    ? <EyeOff size={15} aria-hidden="true"/>
                    : <Eye    size={15} aria-hidden="true"/>}
                </button>
              </div>
              {passwordError && (
                <span id={passwordId + "-err"} className="lp-field-error" role="alert">
                  <AlertCircle size={12} aria-hidden="true"/>
                  {passwordError}
                </span>
              )}
            </div>

            {state.error && (
              <div className="lp-error-banner" role="alert">
                <AlertCircle size={14} aria-hidden="true"/>
                <span>{state.error}</span>
              </div>
            )}

            <button type="submit" className="lp-submit" disabled={state.submitting} aria-busy={state.submitting}>
              {state.submitting
                ? <><Loader2 size={15} className="lp-spin" aria-hidden="true"/><span>Signing in...</span></>
                : <><span>Sign in</span><ArrowRight size={15} aria-hidden="true"/></>
              }
            </button>
          </form>

          <div className="lp-divider" aria-hidden="true">
            <span/><span className="lp-divider__label">or</span><span/>
          </div>

          <button type="button" className="lp-google" disabled aria-disabled="true"
            title="Connect Google OAuth to enable this option.">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
            <span className="lp-google__badge">Not configured</span>
          </button>

          <p className="lp-signup-link">
            New here?{" "}
            <button type="button" className="lp-link" onClick={() => onNavigate?.("signup")}>
              Create an account
            </button>
          </p>

          <p className="lp-privacy">
            Location sharing is always in your control. We never share your position without your explicit permission.
          </p>
        </div>
      </main>
    </div>
  );
}
