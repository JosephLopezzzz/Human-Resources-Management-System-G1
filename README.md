# Human Resources Management System (HRMS)

React + Vite + TypeScript + Supabase. Features: Dashboard, Employees, Departments, Attendance, Leave, Performance, Payroll, Audit Logs, Settings.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` (or create `.env`) and set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

   Get these from Supabase: **Project Settings → API**.

3. **Supabase database**

   Run migrations in order in **Supabase → SQL Editor** (or use Supabase CLI):

   - `supabase/migrations/` – run all `.sql` files in name order (e.g. employees, then payroll: `20260227000001_payroll_full_setup.sql`).

   For payroll specifically, see **SUPABASE_PAYROLL_SETUP.md**. The payroll migration is idempotent (drops existing policies before creating them).

4. **Run locally**

   ```bash
   npm run dev
   ```

   App runs at `http://localhost:5173` (or the port Vite prints).

## Deploy (e.g. Vercel)

1. Push the repo to GitHub.
2. In Vercel: **New Project** → import the repo.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build: `npm run build`, output: `dist`.
5. Deploy. Use the same Supabase project as local, or create a separate Supabase project for production and run migrations there.

## Backup

- **Supabase**: Project Settings → Database → enable backups (paid plans), or use **Database → Backups** / **Point-in-time recovery** if available.
- **Manual**: Use Supabase SQL Editor to export tables, or `pg_dump` via connection string (see Supabase docs).

## Roles

The app uses role-based access with a hierarchy. Roles are stored in `user_metadata.role`. Supported values: `system_admin`, `hr_manager`, `hr_officer`, `payroll_officer`, `finance_manager`, `department_manager`, `employee`. Legacy values `admin`, `hr`, `payroll`, `manager` are mapped to these. Only **System Administrator** and **HR Manager** can create user accounts (and only roles below them). See **SECURITY.md** for full role descriptions.

To set a user to System Administrator (e.g. initial setup), run in SQL Editor:

```sql
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "system_admin"}'::jsonb
WHERE email = 'user@example.com';
```

Legacy: `"role": "admin"` still works and is treated as System Administrator. Then log out and log back in.
