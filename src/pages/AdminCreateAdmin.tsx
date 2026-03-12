import React from "react";
import { useAuth } from "@/auth/useAuth";
import { supabase, invokeFunction } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCanonicalRole, isSystemAdmin, type RoleKey } from "@/auth/roles";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

const CONFIRM_PHRASE = "CREATE ADMIN";

export default function AdminCreateAdmin() {
  const { user, session } = useAuth();
  const rawRole = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const role = getCanonicalRole(rawRole) as RoleKey;
  const canCreate = isSystemAdmin(role);

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [acknowledge, setAcknowledge] = React.useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = React.useState(false);
  const [confirmPhrase, setConfirmPhrase] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const passwordChecks = React.useMemo(() => {
    const value = password ?? "";
    return {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }, [password]);

  const allPasswordChecksPass =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

  if (!canCreate) {
    return (
      <div>
        <PageHeader
          title="Create Admin"
          description="Only System Administrators can create another System Administrator."
        />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You are not authorized to create System Administrator accounts.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!acknowledge) {
      setError("You must acknowledge that this grants full system access.");
      return;
    }
    if (!acceptedPolicies) {
      setError("You must agree to the Terms and Conditions and Privacy Policy.");
      return;
    }
    if (confirmPhrase.trim() !== CONFIRM_PHRASE) {
      setError(`Type exactly "${CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    if (!allPasswordChecksPass) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session: freshSession }, error: refreshError } = await supabase.auth.refreshSession();
      const token = freshSession?.access_token;
      if (refreshError || !token) {
        setError("Session expired or invalid. Please log out and log back in, then try again.");
        setLoading(false);
        return;
      }
      const { data, errorMessage } = await invokeFunction<
        { email: string; password: string; name: string; role: string; username?: string },
        { user?: { id?: string } }
      >("admin-create-user", token, {
        email,
        password,
        name: name || "Administrator",
        role: "system_admin",
        username: username.trim() || undefined,
      });

      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      setSuccess(`System Administrator created. User id: ${data?.user?.id ?? ""}. This action is logged in Audit Logs (ADMIN_CREATE_ADMIN).`);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setUsername("");
      setConfirmPhrase("");
      setAcknowledge(false);
      setAcceptedPolicies(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Create System Administrator"
        description="Create another System Administrator account. This is a privileged action and is logged with strong audit (ADMIN_CREATE_ADMIN)."
      />

      <Alert variant="destructive" className="mb-6 max-w-2xl border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>High privilege</AlertTitle>
        <AlertDescription>
          The new user will have full system control (manage users, settings, all modules). Only create admins for trusted IT or senior HR personnel. Each creation is recorded in Audit Logs with creator and target details.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base">New System Administrator</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Administrator name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username (for login)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin1"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Optional. They can sign in with this instead of email. If empty, derived from name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <p className="font-medium text-muted-foreground">For admins, use a very strong password:</p>
                <p className={passwordChecks.length ? "text-emerald-600" : "text-destructive"}>
                  {passwordChecks.length ? "✓" : "✗"} At least 8 characters
                </p>
                <p className={passwordChecks.upper ? "text-emerald-600" : "text-destructive"}>
                  {passwordChecks.upper ? "✓" : "✗"} Uppercase letter
                </p>
                <p className={passwordChecks.lower ? "text-emerald-600" : "text-destructive"}>
                  {passwordChecks.lower ? "✓" : "✗"} Lowercase letter
                </p>
                <p className={passwordChecks.number ? "text-emerald-600" : "text-destructive"}>
                  {passwordChecks.number ? "✓" : "✗"} Number
                </p>
                <p className={passwordChecks.special ? "text-emerald-600" : "text-destructive"}>
                  {passwordChecks.special ? "✓" : "✗"} Special character
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledge}
                  onCheckedChange={(v) => setAcknowledge(v === true)}
                />
                <label htmlFor="acknowledge" className="text-sm leading-tight cursor-pointer">
                  I understand this grants full system access to the new user. I am authorized to create System
                  Administrators.
                </label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="policies-admin"
                  checked={acceptedPolicies}
                  onCheckedChange={(v) => setAcceptedPolicies(v === true)}
                />
                <label htmlFor="policies-admin" className="text-sm leading-tight cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="underline">
                    Terms and Conditions
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPhrase">Type to confirm</Label>
              <Input
                id="confirmPhrase"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Type exactly: <strong>{CONFIRM_PHRASE}</strong>
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

              <Button
                type="submit"
                disabled={loading || !acknowledge || !acceptedPolicies || !allPasswordChecksPass}
                variant="destructive"
              >
                {loading ? "Creating..." : "Create System Administrator"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
