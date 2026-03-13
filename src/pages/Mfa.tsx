import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { setMfaDeadlineFromNow } from "@/auth/authStorage";

type LocationState = { from?: { pathname?: string } } | null;

export default function Mfa() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const from = ((location.state as LocationState)?.from?.pathname as string | undefined) ?? "/";

  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const mfa = (supabase.auth as { mfa?: { listFactors?: () => Promise<{ data?: { totp?: { id: string }[] }; error?: { message: string } }> } }).mfa;

    (async () => {
      if (!mfa?.listFactors) {
        if (!cancelled) setError("MFA is not available for this project.");
        return;
      }
      const { data, error: listError } = await mfa.listFactors();
      if (cancelled) return;
      if (listError) {
        setError(listError.message);
        return;
      }
      const existing = data?.totp?.[0];
      if (existing?.id) setFactorId(existing.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!loading && !user) return <Navigate to="/login" replace />;

  async function enrollTotp() {
    setError(null);
    setBusy(true);
    try {
      const mfa = (supabase.auth as { mfa?: { enroll?: (opts: { factorType: string }) => Promise<{ data?: { id: string; totp?: { qr_code: string; secret: string } }; error?: { message: string } }> } }).mfa;
      if (!mfa?.enroll) {
        setError("MFA is not available for this project.");
        return;
      }
      const { data, error: enrollError } = await mfa.enroll({ factorType: "totp" });
      if (enrollError) {
        setError(enrollError.message);
        return;
      }
      if (data?.id) setFactorId(data.id);
      if (data?.totp?.qr_code) setQrCode(data.totp.qr_code);
      if (data?.totp?.secret) setSecret(data.totp.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll 2FA.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!factorId) {
      setError("No 2FA factor found. Enroll first.");
      return;
    }
    const mfa = (supabase.auth as { mfa?: { challenge?: (opts: { factorId: string }) => Promise<{ data?: { id: string }; error?: { message: string } }>; verify?: (opts: { factorId: string; challengeId: string; code: string }) => Promise<{ error?: { message: string } }> } }).mfa;
    if (!mfa?.challenge || !mfa?.verify) {
      setError("MFA verify is not available.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data: challengeData, error: challengeError } = await mfa.challenge({ factorId });
      if (challengeError) {
        setError(challengeError.message);
        return;
      }
      const { error: verifyError } = await mfa.verify({
        factorId,
        challengeId: challengeData?.id ?? "",
        code,
      });
      if (verifyError) {
        setError("Invalid code. Try again.");
        return;
      }
      if (user) setMfaDeadlineFromNow(user.id);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code.");
    } finally {
      setBusy(false);
    }
  }

  const canVerify = code.length === 6 && !busy;
  const hasNoFactorYet = !factorId && !qrCode;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            {hasNoFactorYet
              ? "Set up an authenticator app (e.g. Google Authenticator) to secure your account. Required for privileged actions like Create User and Create Admin."
              : qrCode
                ? "Scan the QR code with your authenticator app, then enter the 6-digit code below to finish setup."
                : "Enter a 6-digit code from your authenticator app. You’ll be asked again every 7 days."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasNoFactorYet && (
            <p className="text-sm text-muted-foreground">
              You need 2FA enabled to use <strong>Create User</strong> and <strong>Create Admin</strong>. Set it up once and you’re done.
            </p>
          )}
          {!factorId && (
            <Button type="button" className="w-full" onClick={enrollTotp} disabled={busy}>
              {hasNoFactorYet ? "Set up authenticator app" : "Add another factor"}
            </Button>
          )}

          {qrCode && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/20 p-4 flex items-center justify-center">
                <img src={qrCode} alt="Scan QR code" className="h-40 w-40" />
              </div>
              {secret && (
                <p className="text-xs text-muted-foreground">
                  If you can’t scan, manually enter this secret: <span className="font-mono">{secret}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="button" className="w-full" onClick={verifyCode} disabled={!canVerify}>
              Verify
            </Button>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline"
              onClick={() => navigate(from)}
            >
              Back to app
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-destructive underline flex items-center gap-1"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-3 w-3" /> Sign out and use login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

