## Security overview

This HRMS uses Supabase as its backend with a layered security model:

- **Authentication**: Supabase Auth (email/password and Google OAuth) with MFA support.
- **Authorization**: Role-based access control (RBAC) via `user_metadata.role` and a `user_roles` table. Roles follow a hierarchy; only System Administrator and HR Manager can create user accounts, and only for roles below them.
- **Row-Level Security (RLS)**: Enabled on core tables (`employees`, `departments`, `attendance_logs`, `leave_*`, `payroll_*`, `review_cycles`, `kpi_definitions`, `audit_logs`, `settings`, `user_roles`).
- **Edge Functions**: Used for privileged actions (admin user creation with hierarchy checks, login rate limiting).
- **Frontend guards**: `RequireAuth` and `RequireRole` components restrict access to protected routes; sidebar and actions are filtered by role.

## Roles and access

Roles are stored in `auth.users.user_metadata.role` (and optionally in `user_roles`). Legacy values (`admin`, `hr`, `payroll`, `manager`) are mapped to the canonical roles below.

### 1. System Administrator (`system_admin`)

- **Access**: Full system control.
- **Responsibilities**: Manage user accounts & permissions, configure system settings, manage system backups, view all modules (HR, payroll, compliance).
- **Used by**: IT or senior HR tech personnel.
- **Can create users with roles**: HR Manager, HR Officer, Payroll Officer, Finance Manager, Department Manager, Employee.

### 2. HR Manager (`hr_manager`)

- **Access**: Full HR module access. Cannot modify core system configurations (e.g. Settings).
- **Responsibilities**: Employee lifecycle (hire, promote, terminate), approve leave & benefits, view reports and analytics, oversee performance reviews, ensure labor law compliance.
- **Can create users with roles**: HR Officer, Department Manager, Employee.

### 3. HR Officer / HR Staff (`hr_officer`)

- **Access**: Operational HR tasks. Limited access to salary structure editing.
- **Responsibilities**: Add/edit employee records, process leave applications, maintain documents, update benefits information.

### 4. Payroll Officer (`payroll_officer`)

- **Access**: Payroll module only.
- **Responsibilities**: Process salaries, compute taxes & deductions, generate payslips, manage bonuses & commissions, handle government contributions.
- **Note**: In finance companies, strict audit logging should be enabled for this role.

### 5. Finance Manager / CFO (`finance_manager`)

- **Access**: Payroll & financial reports. Cannot edit employee personal data.
- **Responsibilities**: Approve payroll, view compensation reports, monitor labor costs, budget workforce expenses.

### 6. Department Manager / Branch Manager (`department_manager`)

- **Access**: Team-level access.
- **Responsibilities**: Approve leave requests, conduct performance evaluations.

### 7. Employee (`employee`)

- **Access**: Own data (attendance, leave, own payslip, limited performance views).

### Route access (frontend)

- `/` (Dashboard): Any authenticated user.
- `/employees`: `system_admin`, `hr_manager`, `hr_officer`, `department_manager`, `employee`.
- `/departments`: `system_admin`, `hr_manager`, `hr_officer`, `department_manager`, `employee`.
- `/attendance`: Same as employees.
- `/leave`: Same as employees.
- `/payroll`: `system_admin`, `hr_manager`, `payroll_officer`, `finance_manager`, `employee`.
- `/performance`: `system_admin`, `hr_manager`, `hr_officer`, `department_manager`, `employee`.
- `/audit-logs`: `system_admin`, `hr_manager`.
- `/settings`: `system_admin` only.
- `/admin/users/new`: `system_admin`, `hr_manager` (Create User; assignable roles limited by hierarchy).

Backend RLS ensures that bypassing the UI cannot escalate privileges.

## Edge Functions

### `admin-create-user`

Path: `supabase/functions/admin-create-user/index.ts`

- **Purpose**: Create new Supabase users with roles on behalf of System Administrators or HR Managers.
- **Security controls**:
  - Requires a valid Bearer token; verifies user with `adminClient.auth.getUser(token)`.
  - Creator must be `system_admin` (or legacy `admin`) or `hr_manager` (or legacy `hr`).
  - HR Manager may only assign roles: `hr_officer`, `department_manager`, `employee`. System Administrator may assign any role.
  - Enforces MFA (AAL2) for this privileged operation.
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

- `employees`: RLS allows system_admin/hr_manager/hr_officer full access; department_manager and employee get restricted views.
- `departments`: system_admin, hr_manager, hr_officer can manage; others read-only or by RLS.
- `attendance_logs`: Users see their own; managers/HR see more as per policies.
- `leave_requests`, `leave_balances`: Users see their own; system_admin, hr_manager, hr_officer, department_manager can approve as per role.
- `payroll_runs`, `payroll_items`: system_admin, hr_manager, payroll_officer, finance_manager have broad access; employees see only their own items.
- `review_cycles`, `kpi_definitions`: Everyone can read; system_admin and hr_manager manage.
- `audit_logs`: Only system_admin and hr_manager can read; inserts are performed by backend code (Edge Functions).
- `settings`: Read by all; only system_admin can update.
- `user_roles`: Only system_admin can read/write (or as per your RLS).

## Operational recommendations

- Configure Supabase Auth with:
  - Strong password policy (length and complexity).
  - Session and refresh token lifetimes aligned with your 7‑day session/MFA window, or stricter.
- Ensure environment variables for Edge Functions are set in the Supabase dashboard.
- Regularly review `audit_logs` via the `/audit-logs` page (system_admin, hr_manager).
- When adding new privileged Edge Functions, follow the same pattern:
  - Verify caller token and role.
  - Enforce MFA where appropriate.
  - Write a corresponding audit log entry.
- To set a user to System Administrator (e.g. initial setup), run in SQL Editor:

```sql
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "system_admin"}'::jsonb
WHERE email = 'admin@example.com';
```

Legacy `admin` and `hr` still work and are mapped to `system_admin` and `hr_manager` in the frontend.
