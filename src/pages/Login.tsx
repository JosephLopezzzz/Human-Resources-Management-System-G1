import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLockRemainingMs, registerLoginFailure, resetLoginFailures } from "@/auth/loginRateLimit";
import { useAuth } from "@/auth/useAuth";

type LocationState = { from?: { pathname?: string } } | null;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, needsMfa } = useAuth();

  const from = ((location.state as LocationState)?.from?.pathname as string | undefined) ?? "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [lockRemainingMs, setLockRemainingMs] = React.useState(0);

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
      if (!email) return;
      setLockRemainingMs(getLockRemainingMs(email));
    }, 500);
    return () => window.clearInterval(id);
  }, [email]);

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const locked = email ? getLockRemainingMs(email) : 0;
    if (locked > 0) {
      setLockRemainingMs(locked);
      setError("Too many failed attempts. Please wait a bit and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("login-with-rate-limit", {
        body: { email, password },
      });

      if (fnError) {
        setError("Login failed.");
        return;
      }

      if (!data || data.error) {
        registerLoginFailure(email);
        setLockRemainingMs(getLockRemainingMs(email));
        setError(data?.error ?? "Invalid email or password.");
        return;
      }

      const session = data.session as { access_token: string; refresh_token: string };
      if (session?.access_token && session.refresh_token) {
        await supabase.auth.setSession(session);
      }

      resetLoginFailures(email);
      // AuthProvider will redirect (including to /mfa if due).
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      // Small delay makes rapid brute-force clicking harder (client-side only).
      window.setTimeout(() => setSubmitting(false), 700);
    }
  }

  async function onGoogleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !email || !password || lockRemainingMs > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your HRMS dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin} disabled={submitting}>
            Continue with Google
          </Button>

          <div className="text-xs text-muted-foreground text-center">or</div>

          <form onSubmit={onPasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {lockRemainingMs > 0 && (
              <p className="text-sm text-destructive">
                Locked for {Math.ceil(lockRemainingMs / 1000)}s due to repeated failed attempts.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={disabled}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

