import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
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

    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError) {
        setError(listError.message);
        return;
      }

      // Prefer an already-enrolled TOTP factor if present.
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
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
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

    setError(null);
    setBusy(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        setError(challengeError.message);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Enter a 6-digit code from your authenticator app. You’ll be asked again every 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!factorId && (
            <Button type="button" className="w-full" onClick={enrollTotp} disabled={busy}>
              Set up authenticator
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
        </CardContent>
      </Card>
    </div>
  );
}

