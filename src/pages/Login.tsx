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
import OTPModal from "@/components/OTPModal";

type LocationState = { from?: { pathname?: string } } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, needsMfa } = useAuth();

  const from = ((location.state as LocationState)?.from?.pathname as string | undefined) ?? "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [lockRemainingMs, setLockRemainingMs] = React.useState(0);
  const [forgotPasswordSent, setForgotPasswordSent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showOTPModal, setShowOTPModal] = React.useState(false);
  const [otpEmail, setOtpEmail] = React.useState("");

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
      setLockRemainingMs(username ? getLockRemainingMs(username) : 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [username]);

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setForgotPasswordSent(false);

    const locked = username ? getLockRemainingMs(username) : 0;
    if (locked > 0) {
      setLockRemainingMs(locked);
      setError("Too many failed attempts. Please wait before trying again.");
      setPassword("");
      return;
    }

    setSubmitting(true);
    try {
      const login = username.trim();
      if (!login) {
        setError("Enter your username.");
        setSubmitting(false);
        return;
      }

      const { data: resolved, error: rpcError } = await supabase.rpc("get_email_for_login", {
        login,
      });
      if (rpcError) {
        setError("Could not look up account. Please contact your administrator.");
        setSubmitting(false);
        return;
      }
      if (!resolved) {
        setError("Invalid username or password.");
        registerLoginFailure(login);
        setLockRemainingMs(getLockRemainingMs(login));
        setPassword("");
        setUsername("");
        setSubmitting(false);
        return;
      }

      const email = resolved as string;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        registerLoginFailure(username);
        setLockRemainingMs(getLockRemainingMs(username));
        setPassword("");
        setUsername("");
        const msg = signInError.message;
        if (
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("credentials") ||
          msg.toLowerCase().includes("email")
        ) {
          setError("Invalid username or password.");
        } else {
          setError(msg);
        }
        return;
      }

      resetLoginFailures(emailOrUsername);
      setLockRemainingMs(0);
      // AuthProvider will redirect (including to /mfa if due).
    } catch (err) {
      registerLoginFailure(username);
      setLockRemainingMs(username ? getLockRemainingMs(username) : 0);
      setPassword("");
      setUsername("");
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      window.setTimeout(() => setSubmitting(false), 500);
    }
  }

  async function onForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    const login = username.trim();
    if (!login) {
      setError("Enter your username above, then click Forgot password.");
      return;
    }
    const { data: resolved, error: rpcError } = await supabase.rpc("get_email_for_login", { login });
    if (rpcError || !resolved) {
      setError("Could not look up account for that username. Please contact your administrator.");
      return;
    }
    const email = resolved as string;
    
    // Show OTP modal instead of sending password reset
    setOtpEmail(email);
    setShowOTPModal(true);
    setError(null);
    setForgotPasswordSent(false);
  }

  async function onSendOTP() {
    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: otpEmail }),
      });

      if (response.ok) {
        setError("OTP sent successfully. Please check your email.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOTP(otp: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: otpEmail, otp }),
      });

      const result = await response.json();

      if (response.ok && result.resetLink) {
        // Redirect to the password reset link provided by Supabase
        window.location.href = result.resetLink;
        setShowOTPModal(false);
        setError(null);
      } else {
        setError(result.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const locked = lockRemainingMs > 0;
  const disabled = submitting || !username || !password || locked;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your HR dashboard with your username and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={onPasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin1"
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

            {!locked && username && getFailureCount(username) > 0 && getFailureCount(username) < 5 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {5 - getFailureCount(username)} attempt(s) remaining before lockout.
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
            User accounts are created by an administrator. Use the username they provided to you.
          </p>
        </CardContent>
      </Card>
      
      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerify={onVerifyOTP}
        onResend={onSendOTP}
        email={otpEmail}
      />
    </div>
  );
}
