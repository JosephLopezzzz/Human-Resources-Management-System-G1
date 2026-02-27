import React from "react";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminCreateUser() {
  const { user } = useAuth();
  const isAdmin = (user?.user_metadata?.role as string | undefined) === "admin";

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("user");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Create User" description="Only admins can create new users." />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You are not authorized to access this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email,
          password,
          name: name || "User",
          role,
        },
      });

      if (fnError) {
        setError(fnError.message);
        return;
      }

      setSuccess(`User created with id ${data.user?.id ?? ""}`);
      setEmail("");
      setPassword("");
      setName("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create User" description="Create a new HRMS user account." />

      <Card className="max-w-md">
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
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="user or admin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create user"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

