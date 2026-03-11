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
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import OTPModal from "@/components/OTPModal";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/motion";

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
    <div className="min-h-screen bg-background flex">
      <div className="flex w-full min-h-screen bg-background overflow-hidden">
        {/* Left marketing panel */}
        <motion.div
          className="hidden lg:flex w-[48%] flex-col justify-center px-10 py-10 text-slate-50 relative bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to bottom right, rgba(2,6,23,0.88), rgba(15,23,42,0.96)), url('/favicon1/professional_card.png')",
          }}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div>
            <motion.div
              className="flex items-center gap-3 mb-12 px-1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="h-11 w-11 rounded-2xl bg-slate-900/90 border border-slate-500/70 flex items-center justify-center overflow-hidden shadow-sm">
                <img
                  src="/favicon1/bluepeak-favicon.jpg"
                  alt="BLUEPEAK"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.32em] text-slate-300">
                  BLUEPEAK
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-100">
                  Finance &amp; Human Resources Management
                </span>
              </div>
            </motion.div>

            <StaggerContainer className="space-y-4">
              <StaggerItem>
                <h1 className="text-4xl font-semibold leading-tight">
                  Smart workforce &amp; financial management, simplified.
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="text-sm sm:text-base text-slate-200 max-w-xl">
                  Real-time attendance, payroll, and performance insights in a single secure HR
                  command center built for modern teams.
                </p>
              </StaggerItem>
              <StaggerItem>
                <ul className="mt-5 space-y-2.5 text-sm sm:text-base text-slate-100">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Real-time attendance and leave tracking
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Payroll and performance insights at a glance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                    Secure, role-based access for your team
                  </li>
                </ul>
              </StaggerItem>
            </StaggerContainer>
          </div>

          <motion.div
            className="mt-10 flex items-center gap-2 text-[11px] text-slate-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.5 }}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
            </span>
            Unified HR, payroll, and analytics in one secure platform
          </motion.div>
        </motion.div>

        {/* Right auth panel */}
        <motion.div
          className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 bg-background"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <Card className="w-full max-w-md border-none shadow-none">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access your BLUEPEAK HR workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StaggerContainer className="space-y-4">
                <StaggerItem>
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
                          className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
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
                      <p className="text-sm text-warning">
                        Too many failed attempts. Try again in {Math.ceil(lockRemainingMs / 1000)}s.
                      </p>
                    )}

                    {!locked && username && getFailureCount(username) > 0 && getFailureCount(username) < 5 && (
                      <p className="text-sm text-warning">
                        {5 - getFailureCount(username)} attempt(s) remaining before lockout.
                      </p>
                    )}

                    {forgotPasswordSent && (
                      <p
                        className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
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

                    <Button
                      type="submit"
                      className="w-full transition-transform duration-100 active:scale-[0.98]"
                      disabled={disabled}
                    >
                      {submitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </StaggerItem>

                <StaggerItem>
                  <p className="text-center text-xs text-muted-foreground">
                    User accounts are created by an administrator. Use the username they provided to you.
                  </p>
                </StaggerItem>
              </StaggerContainer>
            </CardContent>
          </Card>

          <OTPModal
            isOpen={showOTPModal}
            onClose={() => setShowOTPModal(false)}
            onVerify={onVerifyOTP}
            onResend={onSendOTP}
            email={otpEmail}
          />
        </motion.div>
      </div>
    </div>
  );
}
