# Auth: Email/Password, 7-Day Session, 2FA, Brute Force

## 1. Email/password vs Google

- **Google-only users** have no password in Supabase. Use **Continue with Google** to sign in.
- To use **email + password**, the user must either:
  - Sign up with **email** (not Google), or
  - Use **Forgot password** on the Login page (Supabase sends a reset link only if the account exists with email provider; Google-only accounts may need to “Add password” via Supabase or link identity—see Supabase docs).

If sign-in says “Invalid login credentials” for correct-looking input, the account was likely created with Google only—no password is stored.

## 2. “Trust this device for 7 days” (long session)

Supabase stores the session in the browser (localStorage) and refreshes it with the **refresh token**. To keep users signed in for about **7 days**:

1. **Supabase Dashboard** → **Authentication** → **Settings** (or **Providers** → **Email**).
2. Under **JWT Settings** / **Session**:
   - **JWT expiry** (access token): can stay 3600s (1 hour).
   - **Refresh token reuse interval** and **Refresh token lifetime**: set refresh token lifetime to **7 days** (604800 seconds) if your plan allows (Supabase caps vary by plan).

The app’s “Trust this device for 7 days” switch is a UX label; the real duration is controlled in Supabase Auth settings.

## 3. 2FA / 6-digit email code (like the reference)

Supabase Auth does **not** send a 6-digit code to email by default for password login. Options:

- **Supabase MFA (TOTP)**: Users can enable authenticator app (Google Authenticator, etc.) in Supabase Auth → MFA.
- **Custom email OTP**: Build an Edge Function that generates a code, sends it via Resend/SendGrid, stores a hash in a table, and verify on login—more work.

## 4. Anti brute force

- **In the app**: After **5 failed** email/password attempts, the form is locked for **5 minutes** (stored in sessionStorage).
- **Supabase**: Auth endpoints are rate-limited. For stricter protection, enable **CAPTCHA** (e.g. hCaptcha) in Supabase Auth settings, or add an Edge Function that logs attempts and blocks by IP/email.
