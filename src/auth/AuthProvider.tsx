import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthContext } from "./AuthContext";
import { ensureMfaDeadline, ensureSessionWindow, isMfaDue, isSessionExpired, setSessionExpiresAt } from "./authStorage";
import type { Session } from "@supabase/supabase-js";

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [needsMfa, setNeedsMfa] = React.useState(false);

  const user = session?.user ?? null;

  const refreshMfaState = React.useCallback(async (userId: string) => {
    ensureMfaDeadline(userId);
    const due = isMfaDue(userId);
    if (!due) {
      setNeedsMfa(false);
      return;
    }

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      // If we can't read AAL, fail safe to requiring MFA.
      setNeedsMfa(true);
      return;
    }
    setNeedsMfa(due && data.currentLevel !== "aal2");
  }, []);

  const applySessionRules = React.useCallback(
    async (s: Session | null) => {
      if (!s?.user) {
        setNeedsMfa(false);
        return;
      }

      const userId = s.user.id;
      ensureSessionWindow(userId);
      ensureMfaDeadline(userId);

      if (isSessionExpired(userId)) {
        await supabase.auth.signOut();
        setNeedsMfa(false);
        return;
      }

      await refreshMfaState(userId);
    },
    [refreshMfaState]
  );

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        await applySessionRules(data.session);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (event === "SIGNED_IN" && newSession?.user) {
        // Start a fresh 7-day session window on every sign-in.
        setSessionExpiresAt(newSession.user.id, Date.now() + MS_7_DAYS);
        ensureMfaDeadline(newSession.user.id);
      }

      await applySessionRules(newSession);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySessionRules]);

  // Background expiry check (covers long-open tabs).
  React.useEffect(() => {
    if (!user) return;
    const id = window.setInterval(async () => {
      if (isSessionExpired(user.id)) {
        await supabase.auth.signOut();
      } else {
        await refreshMfaState(user.id);
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refreshMfaState, user]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, needsMfa, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

