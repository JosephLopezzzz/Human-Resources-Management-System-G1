import React from "react";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabaseClient";
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
  const { user } = useAuth();
  const rawRole = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const role = getCanonicalRole(rawRole) as RoleKey;
  const canCreate = isSystemAdmin(role);

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [acknowledge, setAcknowledge] = React.useState(false);
  const [confirmPhrase, setConfirmPhrase] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
    if (confirmPhrase.trim() !== CONFIRM_PHRASE) {
      setError(`Type exactly "${CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email,
          password,
          name: name || "Administrator",
          role: "system_admin",
        },
      });

      if (fnError) {
        setError(fnError.message);
        return;
      }

      setSuccess(`System Administrator created. User id: ${data.user?.id ?? ""}. This action is logged in Audit Logs (ADMIN_CREATE_ADMIN).`);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setConfirmPhrase("");
      setAcknowledge(false);
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

      <Card className="max-w-md">
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

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledge}
                onCheckedChange={(v) => setAcknowledge(v === true)}
              />
              <label htmlFor="acknowledge" className="text-sm leading-tight cursor-pointer">
                I understand this grants full system access to the new user. I am authorized to create System Administrators.
              </label>
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

            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? "Creating..." : "Create System Administrator"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
