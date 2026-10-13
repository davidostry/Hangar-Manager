import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Plane,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

import "../components/Layout/layout.css";
import "./Login.css";

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the server. Check that the Backend is running.";
    }

    const responseData = error.response.data as
      | { detail?: unknown }
      | undefined;

    const detail = responseData?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages: string[] = [];

      for (const item of detail) {
        if (typeof item !== "object" || item === null) {
          continue;
        }

        const message = (item as { msg?: unknown }).msg;

        if (typeof message === "string") {
          messages.push(message);
        }
      }

      if (messages.length > 0) {
        return messages.join(" ");
      }

      return "Please check the submitted information.";
    }

    if (error.response.status === 401) {
      return "Invalid email or password.";
    }

    return "Login failed. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function LoginBrand() {
  return (
    <aside className="hm-login-showcase" aria-label="HangarManager platform">
      <div className="hm-login-showcase-glow" aria-hidden="true" />
      <div className="hm-login-showcase-plane" aria-hidden="true">
        <Plane size={340} strokeWidth={0.55} />
      </div>

      <div className="hm-login-showcase-brand">
        <div className="hm-login-brand-logo">
          <BrandLogo />
        </div>
        <div className="hm-login-brand-copy">
          <strong>HangarManager</strong>
          <span>AIRCRAFT FLEET MANAGEMENT</span>
        </div>
      </div>

      <div className="hm-login-showcase-content">
        <span className="hm-login-overline">
          <span className="hm-login-overline-dot" aria-hidden="true" />
          FLEET OPERATIONS PLATFORM
        </span>

        <h2>
          Every aircraft.
          <br />
          <span>One clear view.</span>
        </h2>

        <p>
          Manage your fleet, coordinate maintenance, and stay on top of
          inspections—all in one workspace.
        </p>

        <div className="hm-login-feature-list" aria-label="Platform features">
          <div className="hm-login-feature">
            <span className="hm-login-feature-icon"><Plane size={18} /></span>
            <span>Aircraft registry</span>
            <CheckCircle2 size={16} className="hm-login-feature-check" />
          </div>
          <div className="hm-login-feature">
            <span className="hm-login-feature-icon"><Wrench size={18} /></span>
            <span>Maintenance tracking</span>
            <CheckCircle2 size={16} className="hm-login-feature-check" />
          </div>
          <div className="hm-login-feature">
            <span className="hm-login-feature-icon"><ClipboardCheck size={18} /></span>
            <span>Inspection management</span>
            <CheckCircle2 size={16} className="hm-login-feature-check" />
          </div>
        </div>
      </div>

      <div className="hm-login-showcase-footer">
        <Gauge size={17} aria-hidden="true" />
        <span>BUILT FOR AVIATION OPERATIONS</span>
      </div>
    </aside>
  );
}

function Login() {
  const navigate = useNavigate();

  const { user, isLoading: isAuthLoading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthLoading, user, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate("/app/dashboard", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCheckingSession = isAuthLoading || Boolean(user);

  return (
    <main className="hm-login-page">
      <div className="hm-login-shell">
        <LoginBrand />

        <section className="hm-login-auth-panel" aria-labelledby="hm-login-title">
          <div className="hm-login-auth-inner">
            <div className="hm-login-mobile-brand">
              <span className="hm-login-mobile-logo"><BrandLogo /></span>
              <strong>HangarManager</strong>
            </div>

            {isCheckingSession ? (
              <div className="hm-login-session" role="status" aria-live="polite">
                <span className="hm-login-session-icon">
                  <LoaderCircle size={34} className="hm-login-spin" aria-hidden="true" />
                </span>
                <h1 id="hm-login-title">Just a moment</h1>
                <p>
                  {user
                    ? "Redirecting to your dashboard..."
                    : "Checking your session..."}
                </p>
              </div>
            ) : (
              <>
                <div className="hm-login-auth-heading">
                  <span className="hm-login-auth-eyebrow">
                    <ShieldCheck size={16} aria-hidden="true" />
                    SECURE WORKSPACE ACCESS
                  </span>
                  <h1 id="hm-login-title">Welcome back</h1>
                  <p>Sign in to your HangarManager account to continue.</p>
                </div>

                <form
                  className="hm-login-form"
                  onSubmit={(event) => void handleSubmit(event)}
                  aria-busy={isSubmitting}
                >
                  <div className="hm-login-field">
                    <label htmlFor="hm-login-email">Email address</label>
                    <div className="hm-login-input-wrap">
                      <Mail size={19} className="hm-login-input-icon" aria-hidden="true" />
                      <input
                        id="hm-login-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your email"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="hm-login-field">
                    <label htmlFor="hm-login-password">Password</label>
                    <div className="hm-login-input-wrap hm-login-password-wrap">
                      <LockKeyhole size={19} className="hm-login-input-icon" aria-hidden="true" />
                      <input
                        id="hm-login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="hm-login-password-toggle"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="hm-login-error" role="alert">
                      <TriangleAlert size={19} aria-hidden="true" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="hm-login-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle size={19} className="hm-login-spin" aria-hidden="true" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to dashboard
                        <ArrowRight size={20} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                <div className="hm-login-access-note">
                  <ShieldCheck size={19} aria-hidden="true" />
                  <span>Access is available to assigned HangarManager users.</span>
                </div>
              </>
            )}
          </div>

          <div className="hm-login-auth-footer">
            <span>© 2026 HangarManager</span>
            <span>Aircraft Fleet Management</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
