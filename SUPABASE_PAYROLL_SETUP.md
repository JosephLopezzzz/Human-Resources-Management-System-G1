# Supabase Payroll Setup

## Fix "Failed to load current run" and "policy already exists"

1. Open **Supabase Dashboard → SQL Editor**.
2. Copy the **entire** contents of `supabase/migrations/20260227000001_payroll_full_setup.sql`.
3. Paste and **Run**.

The script is **idempotent**: it drops existing policies before creating them, so you can re-run it even if you already ran it once and got "policy already exists".

## If the app still shows the error

- **Log out** of the app and **log back in** so the client has a valid session (RLS requires `authenticated`).
- Confirm `.env` has the correct **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** for this project.

## Policy names used

- `payroll_runs_select_authenticated`, `payroll_runs_insert_authenticated`, `payroll_runs_update_authenticated`
- `payroll_items_select_authenticated`, `payroll_items_insert_authenticated`, `payroll_items_update_authenticated`

If you created policies under different names earlier, drop them manually in SQL Editor:

```sql
DROP POLICY IF EXISTS "your_old_policy_name" ON public.payroll_runs;
DROP POLICY IF EXISTS "your_old_policy_name" ON public.payroll_items;
```

Then run the full migration again.

---

## Temporary admin role (for testing)

In **Supabase → SQL Editor**, run (replace with your email):

```sql
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

Then **log out** of the app and **log back in**. To remove admin later, set `role` to `"employee"` or delete the key.
