const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;

function key(userId: string, suffix: string) {
  return `hrms.auth.${userId}.${suffix}`;
}

export function getSessionExpiresAt(userId: string): number | null {
  const raw = localStorage.getItem(key(userId, "sessionExpiresAt"));
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function setSessionExpiresAt(userId: string, expiresAt: number) {
  localStorage.setItem(key(userId, "sessionExpiresAt"), String(expiresAt));
}

export function ensureSessionWindow(userId: string, now = Date.now()) {
  const existing = getSessionExpiresAt(userId);
  if (!existing) setSessionExpiresAt(userId, now + MS_7_DAYS);
}

export function isSessionExpired(userId: string, now = Date.now()) {
  const expiresAt = getSessionExpiresAt(userId);
  return typeof expiresAt === "number" && now > expiresAt;
}

export function getMfaDeadlineAt(userId: string): number | null {
  const raw = localStorage.getItem(key(userId, "mfaDeadlineAt"));
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function ensureMfaDeadline(userId: string, now = Date.now()) {
  const existing = getMfaDeadlineAt(userId);
  if (!existing) localStorage.setItem(key(userId, "mfaDeadlineAt"), String(now + MS_7_DAYS));
}

export function setMfaDeadlineFromNow(userId: string, now = Date.now()) {
  localStorage.setItem(key(userId, "mfaDeadlineAt"), String(now + MS_7_DAYS));
}

export function isMfaDue(userId: string, now = Date.now()) {
  const deadline = getMfaDeadlineAt(userId);
  return typeof deadline === "number" && now > deadline;
}

