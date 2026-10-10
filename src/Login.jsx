import { useState, useId, useReducer } from "react";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createAccount, getFirebaseAuthErrorMessage, signIn } from "./firebaseAuth";
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

export default function Login({ onSignIn }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mode, setMode] = useState("login");
  const emailId = useId();
  const passwordId = useId();

  const emailError   = state.touched.email    ? validateEmail(state.email)       : null;
  const passwordError = state.touched.password ? validatePassword(state.password) : null;

  function switchAuthMode() {
    setMode(mode === "login" ? "signup" : "login");
    dispatch({ type: "SUBMIT_SUCCESS" });
    dispatch({ type: "SET_FIELD", field: "error", value: null });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: "TOUCH", field: "email" });
    dispatch({ type: "TOUCH", field: "password" });
    if (validateEmail(state.email) || validatePassword(state.password)) return;
    dispatch({ type: "SUBMIT_START" });
    try {
      if (mode === "signup") {
        await createAccount(state.email, state.password);
        dispatch({ type: "SUBMIT_SUCCESS" });
        onSignIn?.();
      } else {
        await signIn(state.email, state.password);
        dispatch({ type: "SUBMIT_SUCCESS" });
        onSignIn?.();
      }
    } catch (error) {
      dispatch({ type: "SUBMIT_ERROR", message: getFirebaseAuthErrorMessage(error) });
    }
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
            <h2 className="lp-form-head__title">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <p className="lp-form-head__sub">{mode === "signup" ? "Create an account to get started." : "Sign in to continue to your account."}</p>
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
              <label htmlFor={passwordId} className="lp-label">Password</label>
              <div className="lp-input-wrap">
                <input
                  id={passwordId}
                  type={state.showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                ? <><Loader2 size={15} className="lp-spin" aria-hidden="true"/><span>{mode === "signup" ? "Creating account..." : "Signing in..."}</span></>
                : <><span>{mode === "signup" ? "Create account" : "Sign in"}</span><ArrowRight size={15} aria-hidden="true"/></>
              }
            </button>
          </form>

          <p className="lp-signup-link">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button type="button" className="lp-link" onClick={switchAuthMode}>
              {mode === "login" ? "Create an account" : "Sign in"}
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
