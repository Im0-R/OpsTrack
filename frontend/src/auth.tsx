import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, readSession, saveSession } from "./api";
import type { Session } from "./types";

const AuthContext = createContext<{
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}>(null!);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const signOut = () => {
    saveSession(null);
    setSession(null);
  };
  useEffect(() => {
    window.addEventListener("opstrack-expired", signOut);
    const timeout = session
      ? window.setTimeout(
          signOut,
          Math.max(0, Date.parse(session.expiresAt) - Date.now()),
        )
      : undefined;
    return () => {
      window.removeEventListener("opstrack-expired", signOut);
      window.clearTimeout(timeout);
    };
  }, [session]);
  return (
    <AuthContext.Provider
      value={{
        session,
        signOut,
        signIn: (value) => {
          saveSession(value);
          setSession(value);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function Protected({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  return session ? (
    children
  ) : (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
}
export function AuthPage({ register = false }: { register?: boolean }) {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (session) return <Navigate to="/" replace />;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<Session>(
        register ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(data) },
      );
      signIn(result);
      const destination = location.state?.from;
      navigate(
        typeof destination === "string" &&
          destination.startsWith("/") &&
          !destination.startsWith("//")
          ? destination
          : "/",
        { replace: true },
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/" className="brand">
          <span className="logo">O</span>OpsTrack
          <span className="brand-dot">.</span>
        </Link>
        <div>
          <span className="eyebrow">CLARITY FOR EVERY OPERATION</span>
          <h1>
            Keep your team
            <br />
            on the same page.
          </h1>
          <p>
            From the first report to the final resolution. Give every
            operational request a clear owner and a path forward.
          </p>
          <div className="story-line">
            <i />
            Report <span>→</span> Assign <span>→</span> Resolve
          </div>
        </div>
        <small>Built for the work behind the work.</small>
      </section>
      <section className="auth-form">
        <div className="auth-box">
          <span className="eyebrow">YOUR OPERATIONS WORKSPACE</span>
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p>
            {register
              ? "Join your team and bring the work together."
              : "Sign in to see what needs your attention."}
          </p>
          <form onSubmit={submit}>
            {error && (
              <div role="alert" className="alert">
                {error}
              </div>
            )}
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 12 : 1}
                maxLength={128}
              />
              {register && <small>Use at least 12 characters.</small>}
            </label>
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create account →"
                  : "Sign in →"}
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to OpsTrack?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
