type State = {
  failures: number;
  lockedUntil: number; // epoch ms
  lastFailureAt: number; // epoch ms
};

function key(identifier: string) {
  return `hrms.login.rl.${identifier.toLowerCase()}`;
}

function readState(identifier: string): State | null {
  const raw = localStorage.getItem(key(identifier));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<State>;
    if (
      typeof parsed.failures !== "number" ||
      typeof parsed.lockedUntil !== "number" ||
      typeof parsed.lastFailureAt !== "number"
    ) {
      return null;
    }
    return {
      failures: parsed.failures,
      lockedUntil: parsed.lockedUntil,
      lastFailureAt: parsed.lastFailureAt,
    };
  } catch {
    return null;
  }
}

function writeState(identifier: string, state: State) {
  localStorage.setItem(key(identifier), JSON.stringify(state));
}

export function getLockRemainingMs(identifier: string, now = Date.now()): number {
  const s = readState(identifier);
  if (!s) return 0;
  return Math.max(0, s.lockedUntil - now);
}

export function registerLoginFailure(identifier: string, now = Date.now()) {
  const prev = readState(identifier);
  const failures = (prev?.failures ?? 0) + 1;

  // Backoff schedule (minutes) after failure #:
  // 1-4: no lock (just UI delay handled by caller)
  // 5: 1m, 6: 2m, 7: 5m, 8+: 15m
  let lockMinutes = 0;
  if (failures === 5) lockMinutes = 1;
  else if (failures === 6) lockMinutes = 2;
  else if (failures === 7) lockMinutes = 5;
  else if (failures >= 8) lockMinutes = 15;

  const lockedUntil = lockMinutes > 0 ? now + lockMinutes * 60 * 1000 : now;

  writeState(identifier, { failures, lockedUntil, lastFailureAt: now });
}

export function resetLoginFailures(identifier: string) {
  localStorage.removeItem(key(identifier));
}

