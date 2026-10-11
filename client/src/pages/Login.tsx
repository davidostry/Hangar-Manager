import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { isAxiosError } from "axios";
import { useNavigate } from "react-router";

import { useAuth } from "../context/AuthContext";
import "../components/Layout/layout.css";

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

function Login() {
  const navigate = useNavigate();

  const {
    user,
    isLoading: isAuthLoading,
    login,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthLoading, user, navigate]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      navigate("/app/dashboard", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading || user) {
    return (
      <main className="login-page">
        <section className="login-panel" role="status">
          <div className="login-brand-icon">H</div>

          <h1>HangarManager</h1>

          <p>
            {user
              ? "Redirecting to your dashboard..."
              : "Checking your session..."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand-icon">H</div>

        <h1>HangarManager</h1>

        <p>Sign in to manage your aircraft fleet.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>

            <input
              id="email"
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

          <div className="form-field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <div className="login-error" role="alert">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="login-note">
          Use your assigned HangarManager account.
        </p>
      </section>
    </main>
  );
}

export default Login;