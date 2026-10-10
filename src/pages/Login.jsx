import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Panel from "../components/ui/Panel";
import Logo, { APP_NAME } from "../components/ui/Logo";
import { Alert, Button, Field } from "../components/ui/primitives";
import { useGlobal } from "../state/context";

export default function Login() {
  const { login } = useGlobal();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Sign in · ${APP_NAME}`;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.status === 401 ? "Incorrect email or password." : err.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Panel footer="Secure access">
          <Logo size={34} className="auth-card__logo" />
          <div className="eyebrow">Quality Management System</div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Sign in</h1>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>Access ISO dashboards, evidence and files.</p>

          {error && <Alert>{error}</Alert>}

          <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
            <Field label="Email">
              <input className="input input--lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" autoComplete="username" required autoFocus />
            </Field>
            <Field label="Password">
              <input className="input input--lg" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required />
            </Field>
            <Button type="submit" block disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
