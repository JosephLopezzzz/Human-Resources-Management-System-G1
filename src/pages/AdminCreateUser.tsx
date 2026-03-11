import React from "react";
import { useAuth } from "@/auth/useAuth";
import { supabase, invokeFunction } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCanonicalRole,
  canCreateUsers,
  getAssignableRolesFor,
  ROLE_LABELS,
  type RoleKey,
} from "@/auth/roles";
import { Eye, EyeOff } from "lucide-react";

export default function AdminCreateUser() {
  const { user, session } = useAuth();
  const rawRole = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const role = getCanonicalRole(rawRole) as RoleKey;
  const canCreate = canCreateUsers(role);
  const assignableRoles = getAssignableRolesFor(role);
  const defaultRole = assignableRoles[0] ?? "employee";

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<RoleKey>(defaultRole);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = React.useState(false);
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
        <PageHeader title="Create User" description="Only System Administrators and HR Managers can create users (accounts below them in the hierarchy)." />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You are not authorized to create user accounts.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
    if (!acceptedPolicies) {
      setError("You must agree to the Terms and Conditions and Privacy Policy.");
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
        name: name || "User",
        role: selectedRole,
        username: username || undefined,
      });

      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      setSuccess(`User created with id ${data?.user?.id ?? ""}`);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAcceptedPolicies(false);
      setName("");
      setUsername("");
      setSelectedRole(defaultRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Create User"
        description="Create a new HRMS user account. You can only assign roles below you in the hierarchy."
      />

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base">New User</CardTitle>
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
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username (for login)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                This will be the unique username they use to sign in. If left blank, it is derived from their name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as RoleKey)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can only assign roles that are below your role in the hierarchy.
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
                <p className="font-medium text-muted-foreground">Password must include:</p>
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

            <div className="flex items-start space-x-2">
              <Checkbox
                id="policies"
                checked={acceptedPolicies}
                onCheckedChange={(v) => setAcceptedPolicies(v === true)}
              />
              <label htmlFor="policies" className="text-sm leading-tight cursor-pointer">
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

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

              <Button type="submit" disabled={loading || !allPasswordChecksPass || !acceptedPolicies}>
                {loading ? "Creating..." : "Create user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
