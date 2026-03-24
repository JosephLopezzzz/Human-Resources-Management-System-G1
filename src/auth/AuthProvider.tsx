import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthContext } from "./AuthContext";
import { useAudit } from "@/hooks/useAudit";
import { ensureSessionWindow, isSessionExpired, setSessionExpiresAt } from "./authStorage";
import type { Session } from "@supabase/supabase-js";

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_12_HOURS = 12 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);

  const user = session?.user ?? null;

  const applySessionRules = React.useCallback(
    async (s: Session | null) => {
      if (!s?.user) {
        return;
      }

      const userId = s.user.id;
      ensureSessionWindow(userId);

      if (isSessionExpired(userId)) {
        await supabase.auth.signOut();
        return;
      }
    },
    []
  );

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        try {
          await applySessionRules(data.session);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        if (isMounted) setSession(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { logEvent } = useAudit();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN" && newSession?.user) {
        const remember = localStorage.getItem("hrms.rememberMe") === "true";
        const duration = remember ? MS_7_DAYS : MS_12_HOURS;
        setSessionExpiresAt(newSession.user.id, Date.now() + duration);

        // Audit Log: Sign In
        logEvent("USER_SIGN_IN", "auth", "USER", newSession.user.id, {
          remember_me: remember,
          duration_ms: duration,
        });
      }
      try {
        await applySessionRules(newSession);
      } catch {
        // ignore
      }
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
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

