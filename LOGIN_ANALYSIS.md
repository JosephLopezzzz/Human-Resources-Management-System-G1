# Login: What Was Wrong and What We Fixed

## Why you saw "Login failed." (and no Forgot password / lockout text)

### 1. **Code path**

- The app was calling **Supabase Edge Function** `login-with-rate-limit` instead of Supabase Auth directly.
- That function:
  - Reads from the **`audit_logs`** table to count failed attempts.
  - If that read fails (table missing, RLS, or DB error), it returns **503**.
  - The client treats any **invoke error** as a generic **"Login failed."** and never showed the real reason.

So **"Login failed."** usually meant one of:

- Edge Function **not deployed** for this project, or
- Edge Function returned **503** (e.g. `audit_logs` missing or not readable), or
- Network / CORS / timeout calling the function.

It did **not** necessarily mean wrong password; wrong password is returned by the function as **"Invalid email or password."** (and would have shown that text).

### 2. **Missing UI**

- **Forgot password** link and success message were never added to this Login page.
- **Anti–brute-force** logic existed in `loginRateLimit.ts` (localStorage), but the lockout message only appeared when the **Edge Function** returned an error (invalid credentials). When the function call itself failed, we never called `registerLoginFailure`, so you never saw "Locked for Xs" or "X attempts remaining."
- **Google vs email** helper text was never added.

### 3. **Supabase checklist**

For **email/password** to work at all:

- **Authentication → Providers → Email**: **Enable** "Email" and, if you want, "Confirm email" (optional).
- User must have a **password** set in Auth (either signed up with email or set via "Forgot password"). **Google-only** users have no password until they set one (e.g. via reset).

---

## What we changed

1. **Login now uses Supabase Auth directly**  
   `supabase.auth.signInWithPassword({ email, password })` is used instead of the Edge Function. So login works as long as:
   - Email provider is enabled in Supabase.
   - The user has a password (email signup or reset).

2. **Forgot password**  
   - "Forgot password?" link next to the Password label.  
   - Calls `supabase.auth.resetPasswordForEmail(email)`.  
   - Success message in the UI: "Check your email for a password reset link."

3. **Anti–brute-force (client-side)**  
   - On each failed sign-in we call `registerLoginFailure(email)`.  
   - We show "X attempt(s) remaining before lockout" and, after 5 failures, "Locked for Xs…" using `getLockRemainingMs(email)`.

4. **Google vs email**  
   - Helper text: use **Continue with Google** if you signed up with Google; use email/password only if you created the account with email or set a password via Forgot password.  
   - On "Invalid login credentials" we show a friendlier message pointing to Google or Forgot password.

5. **Optional: Edge Function again later**  
   If you deploy `login-with-rate-limit` and ensure `audit_logs` exists and is readable by the function, you can switch the client back to calling it for server-side rate limiting and audit; the same UI (Forgot password, lockout, helper text) will still apply.
