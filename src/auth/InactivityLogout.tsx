import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 60 * 1000; // 1 minute
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
const CHANNEL_NAME = "hrms-auth";
const LS_LOGOUT_KEY = "hrms:logout";

type LogoutReason = "inactivity" | "user" | "remote";

function safeClearStorage() {
  try {
    window.localStorage?.clear();
  } catch {
    // ignore
  }
  try {
    window.sessionStorage?.clear();
  } catch {
    // ignore
  }
}

export function InactivityLogout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const warningTimeoutRef = React.useRef<number | null>(null);
  const logoutTimeoutRef = React.useRef<number | null>(null);
  const countdownIntervalRef = React.useRef<number | null>(null);
  const lastActivityRef = React.useRef<number>(Date.now());
  const bcRef = React.useRef<BroadcastChannel | null>(null);

  const [warningOpen, setWarningOpen] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(60);

  const clearTimers = React.useCallback(() => {
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) window.clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    warningTimeoutRef.current = null;
    logoutTimeoutRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const broadcastLogout = React.useCallback(() => {
    const payload = { type: "logout", ts: Date.now() };

    // BroadcastChannel (preferred when available)
    try {
      bcRef.current?.postMessage(payload);
    } catch {
      // ignore
    }

    // Storage event fallback (also works across tabs)
    try {
      window.localStorage?.setItem(LS_LOGOUT_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, []);

  const performLogout = React.useCallback(
    async (reason: LogoutReason) => {
      clearTimers();
      setWarningOpen(false);

      if (reason !== "remote") {
        broadcastLogout();
      }

      try {
        await signOut();
      } finally {
        // Explicit requirement: remove tokens & clear storage on logout
        safeClearStorage();
        navigate("/login", { replace: true });
      }
    },
    [broadcastLogout, clearTimers, navigate, signOut],
  );

  const startCountdown = React.useCallback(() => {
    setSecondsRemaining(60);
    const startedAt = Date.now();
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
      setSecondsRemaining(remaining);
    }, 250);
  }, []);

  const armTimers = React.useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();

    warningTimeoutRef.current = window.setTimeout(() => {
      setWarningOpen(true);
      startCountdown();
    }, INACTIVITY_MS - WARNING_MS);

    logoutTimeoutRef.current = window.setTimeout(() => {
      void performLogout("inactivity");
    }, INACTIVITY_MS);
  }, [clearTimers, performLogout, startCountdown]);

  const onActivity = React.useCallback(() => {
    const now = Date.now();
    // Small throttle to avoid re-arming timers too frequently on mousemove
    if (now - lastActivityRef.current < 500) return;
    lastActivityRef.current = now;

    if (warningOpen) setWarningOpen(false);
    armTimers();
  }, [armTimers, warningOpen]);

  // Start/stop based on auth state
  React.useEffect(() => {
    if (!user) {
      clearTimers();
      setWarningOpen(false);
      return;
    }

    armTimers();

    const opts: AddEventListenerOptions = { passive: true };
    for (const e of ACTIVITY_EVENTS) {
      window.addEventListener(e, onActivity, opts);
    }

    return () => {
      for (const e of ACTIVITY_EVENTS) {
        window.removeEventListener(e, onActivity);
      }
      clearTimers();
    };
  }, [armTimers, clearTimers, onActivity, user]);

  // Multi-tab logout synchronization
  React.useEffect(() => {
    if (!user) return;

    // BroadcastChannel listener
    if ("BroadcastChannel" in window) {
      try {
        bcRef.current = new BroadcastChannel(CHANNEL_NAME);
        bcRef.current.onmessage = (ev: MessageEvent) => {
          if (!ev?.data || ev.data.type !== "logout") return;
          void performLogout("remote");
        };
      } catch {
        bcRef.current = null;
      }
    }

    // localStorage fallback listener
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== LS_LOGOUT_KEY || !ev.newValue) return;
      void performLogout("remote");
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        bcRef.current?.close();
      } catch {
        // ignore
      }
      bcRef.current = null;
    };
  }, [performLogout, user]);

  if (!user) return null;

  return (
    <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inactivity detected</AlertDialogTitle>
          <AlertDialogDescription>
            You will be logged out in {secondsRemaining} seconds due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setWarningOpen(false);
              armTimers();
            }}
          >
            Stay Logged In
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void performLogout("user")}
          >
            Log Out Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

