import React, { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff } from "lucide-react";

export function RequireSudo({ children, forceFresh = false }: { children: React.ReactNode; forceFresh?: boolean }) {
  const { user } = useAuth();
  const [isSudo, setIsSudo] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (forceFresh) {
      setIsSudo(false);
      return;
    }
    const expiry = sessionStorage.getItem("hrms.sudoExpiry");
    if (expiry && parseInt(expiry, 10) > Date.now()) {
      setIsSudo(true);
    }
  }, [forceFresh]);

  if (isSudo) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) throw signInError;

      // Grant Sudo access for 15 minutes
      sessionStorage.setItem("hrms.sudoExpiry", (Date.now() + 15 * 60 * 1000).toString());
      setIsSudo(true);
    } catch (err) {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full min-h-[60vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-xl border-border/50 glass-panel">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-1">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Security Verification</CardTitle>
          <CardDescription className="text-sm">
            You are attempting to access a high-privilege area. Please re-enter your password to confirm your identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Account Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pr-10 h-11"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground outline-none p-1 rounded-sm"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center font-medium bg-destructive/10 py-2 rounded-md border border-destructive/20">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11 text-base transition-transform active:scale-[0.98]" disabled={loading || !password}>
              {loading ? "Verifying Identity..." : "Verify Identity"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
