## Security overview

This HRMS uses Supabase as its backend with a layered security model:

- **Authentication**: Supabase Auth (email/password and Google OAuth) with MFA support.
- **Authorization**: Role-based access control (RBAC) via `user_metadata.role` and a `user_roles` table.
- **Row-Level Security (RLS)**: Enabled on core tables (`employees`, `departments`, `attendance_logs`, `leave_*`, `payroll_*`, `review_cycles`, `kpi_definitions`, `audit_logs`, `settings`, `user_roles`).
- **Edge Functions**: Used for privileged actions (admin user creation, login rate limiting).
- **Frontend guards**: `RequireAuth` and `RequireRole` components restrict access to protected routes.

## Roles and access

The app assumes these logical roles (stored in `auth.users.user_metadata.role` and optionally in `user_roles`):

- `admin`: Full access to all modules and settings.
- `hr`: HR management (employees, departments, leave, performance, settings).
- `manager`: Limited visibility into team-level information (intended for future expansion).
- `employee`: Regular user; can see and manage own data (attendance, leave, limited performance views).
- `payroll`: Access to payroll runs and items.
- `security`: Access to audit logs.

### Route access (frontend)

- `/` (Dashboard): Any authenticated user.
- `/employees`: `admin`, `hr`, `manager` (via component-level checks).
- `/departments`: `admin`, `hr`.
- `/attendance`: Any authenticated user (but data filtered by RLS).
- `/leave`: Any authenticated user (but data filtered by RLS).
- `/payroll`: `admin`, `hr`, `payroll` (wrapped in `RequireRole`).
- `/performance`: Any authenticated user (visibility governed by RLS).
- `/audit-logs`: `admin`, `hr`, `security` (wrapped in `RequireRole`).
- `/settings`: `admin`, `hr` (wrapped in `RequireRole`).
- `/admin/users/new`: `admin` only.

Backend RLS ensures that bypassing the UI cannot escalate privileges.

## Edge Functions

### `admin-create-user`

Path: `supabase/functions/admin-create-user/index.ts`

- **Purpose**: Create new Supabase users with roles on behalf of admins.
- **Security controls**:
  - Requires a valid Bearer token; verifies user with `adminClient.auth.getUser(token)`.
  - Enforces `user_metadata.role === "admin"`.
  - Enforces MFA (AAL2) via `auth.mfa.getAuthenticatorAssuranceLevel()` on a user-scoped client.
  - Writes an `ADMIN_CREATE_USER` record to `audit_logs` on success.
- **Env vars required**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (service role)
  - `SUPABASE_ANON_KEY`

### `login-with-rate-limit`

Path: `supabase/functions/login-with-rate-limit/index.ts`

- **Purpose**: Wrap `signInWithPassword` with server-side rate limiting and audit logging.
- **Behavior**:
  - Counts `LOGIN_FAILED` entries in `audit_logs` for the email within the last 15 minutes.
  - If failures ≥ 10, returns HTTP `429` with a generic throttle message.
  - On failure:
    - Writes `LOGIN_FAILED` record to `audit_logs` with IP.
    - Returns HTTP `401` with a generic error.
  - On success:
    - Writes `LOGIN_SUCCESS` record to `audit_logs`.
    - Returns `{ session: { access_token, refresh_token }, user }` so the frontend can call `auth.setSession`.
- **Env vars required**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

The `Login` page calls this function via `supabase.functions.invoke("login-with-rate-limit")` instead of direct `signInWithPassword`.

## Tables and RLS (high level)

- `employees`: RLS allows admin/HR full access; other roles get restricted views; frontend hooks use React Query.
- `departments`: Admin/HR can manage; others read-only.
- `attendance_logs`: Users see their own records; managers/HR/admin see more as per policies.
- `leave_requests`, `leave_balances`: Users see their own; admin/HR can approve and see all.
- `payroll_runs`, `payroll_items`: Only `admin`, `hr`, `payroll` have broad access; employees can see only their own items.
- `review_cycles`, `kpi_definitions`: Everyone can read; admin/HR manage.
- `audit_logs`: Only `admin`, `hr`, `security` can read; inserts are performed by backend code (Edge Functions).
- `settings`: Everyone can read; only `admin`/`hr` can update.
- `user_roles`: Only `admin`/`hr` can read/write.

## Operational recommendations

- Configure Supabase Auth with:
  - Strong password policy (length and complexity).
  - Session and refresh token lifetimes aligned with your 7‑day session/MFA window, or stricter.
- Ensure environment variables for Edge Functions are set in the Supabase dashboard.
- Regularly review `audit_logs` via the `/audit-logs` page (only for `admin`/`hr`/`security` roles).
- When adding new privileged Edge Functions, follow the same pattern:
  - Verify caller token and role.
  - Enforce MFA where appropriate.
  - Write a corresponding audit log entry.

