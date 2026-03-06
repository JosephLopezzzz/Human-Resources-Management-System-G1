import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLockRemainingMs,
  getFailureCount,
  registerLoginFailure,
  resetLoginFailures,
} from "@/auth/loginRateLimit";
import { useAuth } from "@/auth/useAuth";
import { Eye, EyeOff } from "lucide-react";

type LocationState = { from?: { pathname?: string } } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, needsMfa } = useAuth();

  const from = ((location.state as LocationState)?.from?.pathname as string | undefined) ?? "/";

  const [emailOrUsername, setEmailOrUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [lockRemainingMs, setLockRemainingMs] = React.useState(0);
  const [forgotPasswordSent, setForgotPasswordSent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    if (needsMfa) {
      navigate("/mfa", { replace: true, state: { from: { pathname: from } } });
    } else {
      navigate(from, { replace: true });
    }
  }, [from, navigate, needsMfa, user]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setLockRemainingMs(emailOrUsername ? getLockRemainingMs(emailOrUsername) : 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [emailOrUsername]);

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setForgotPasswordSent(false);

    const locked = emailOrUsername ? getLockRemainingMs(emailOrUsername) : 0;
    if (locked > 0) {
      setLockRemainingMs(locked);
      setError("Too many failed attempts. Please wait before trying again.");
      setPassword("");
      return;
    }

    setSubmitting(true);
    try {
      const login = emailOrUsername.trim();
      let email = login;
      if (!login.includes("@")) {
        const { data: resolved, error: rpcError } = await supabase.rpc("get_email_for_login", {
          login,
        });
        if (rpcError) {
          setError("Could not look up account. Use your email if you don't have a username.");
          setSubmitting(false);
          return;
        }
        if (!resolved) {
          setError("Invalid email or username. If you only sign in with Google, use “Continue with Google” above.");
          registerLoginFailure(login);
          setLockRemainingMs(getLockRemainingMs(login));
          setPassword("");
          setEmailOrUsername("");
          setSubmitting(false);
          return;
        }
        email = resolved;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        registerLoginFailure(emailOrUsername);
        setLockRemainingMs(getLockRemainingMs(emailOrUsername));
        setPassword("");
        setEmailOrUsername("");
        const msg = signInError.message;
        if (
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("credentials") ||
          msg.toLowerCase().includes("email")
        ) {
          setError(
            "Invalid email or password. If you only sign in with Google, use “Continue with Google” above. Otherwise use Forgot password to set a password."
          );
        } else {
          setError(msg);
        }
        return;
      }

      resetLoginFailures(emailOrUsername);
      setLockRemainingMs(0);
      // AuthProvider will redirect (including to /mfa if due).
    } catch (err) {
      registerLoginFailure(emailOrUsername);
      setLockRemainingMs(emailOrUsername ? getLockRemainingMs(emailOrUsername) : 0);
      setPassword("");
      setEmailOrUsername("");
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      window.setTimeout(() => setSubmitting(false), 500);
    }
  }

  async function onForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    const login = emailOrUsername.trim();
    if (!login) {
      setError("Enter your email or username above, then click Forgot password.");
      return;
    }
    let email = login;
    if (!login.includes("@")) {
      const { data: resolved, error: rpcError } = await supabase.rpc("get_email_for_login", { login });
      if (rpcError || !resolved) {
        setError("Enter your email above for password reset (username lookup not available for reset).");
        return;
      }
      email = resolved;
    }
    setError(null);
    setForgotPasswordSent(false);
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setForgotPasswordSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const locked = lockRemainingMs > 0;
  const disabled = submitting || !emailOrUsername || !password || locked;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your HRMS dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogleLogin}
            disabled={submitting}
          >
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Use <strong>Continue with Google</strong> if you signed up with Google. Use email + password only if you created the account with email or set a password via Forgot password.
          </p>

          <form onSubmit={onPasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">Email / Username</Label>
              <Input
                id="emailOrUsername"
                type="text"
                autoComplete="username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="admin1 or you@company.com"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
                  onClick={onForgotPassword}
                  disabled={submitting || locked}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={submitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {locked && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Too many failed attempts. Try again in {Math.ceil(lockRemainingMs / 1000)}s.
              </p>
            )}

            {!locked && emailOrUsername && getFailureCount(emailOrUsername) > 0 && getFailureCount(emailOrUsername) < 5 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {5 - getFailureCount(emailOrUsername)} attempt(s) remaining before lockout.
              </p>
            )}

            {forgotPasswordSent && (
              <p
                className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
                role="status"
              >
                Check your email for a password reset link. If you don’t see it, check spam.
              </p>
            )}

            {error && !forgotPasswordSent && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={disabled}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Signed up with Google only? Use <strong>Continue with Google</strong>. Email/password is for accounts created with email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
