# Payroll – Next Steps After Supabase Setup

You’ve added the payroll tables and RLS in Supabase. Here’s a concise checklist for what to do next and what to fix or improve.

---

## 1. Verify the current setup

- **Log out and log back in** so the app uses the new RLS policies.
- Open **Payroll** and click **Retry** if you still see “Failed to load current run.”
- If it loads with no error, the base setup is working.

---

## 2. Generate payroll from employees (implemented)

- **Generate Payroll** now creates a run **and** creates `payroll_items` from the **employees** table.
- Only employees with status `regular` or `probation` are included.
- `base_salary` comes from `employees.salary_amount`; allowances, deductions, tax start at 0 (editable later if you add UI).

---

## 3. Optional improvements

| Area | What to do |
|------|------------|
| **Edit line items** | Add UI (e.g. inline or modal) to edit allowances, deductions, tax for each row before locking. |
| **Payroll History** | Enable the History tab: query past `payroll_runs` (e.g. by period) and show runs with a link to view items. |
| **Access control** | Restrict Payroll route to admin/hr/payroll via `<RequireRole allowed={["admin","hr","payroll"]}>` if you want only those roles to open the page. |
| **RLS by role** | Tighten RLS so only admin/hr/payroll can INSERT/UPDATE payroll tables (e.g. using `auth.jwt() ->> 'user_metadata' ->> 'role'`). |
| **Employee ↔ User link** | If you have `auth.users`, add `user_id` to `employees` and use it in `payroll_items` so employees can see “my payslips” filtered by their user id. |

---

## 4. If something is still broken

- Confirm **same Supabase project** as in `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- In Supabase SQL Editor: `SELECT * FROM public.payroll_runs LIMIT 1;` — if “relation does not exist”, run the full migration again (`20260227000001_payroll_full_setup.sql`).
- Check browser console and network tab for the exact error (e.g. 403, 404, or RLS policy violation).

---

## 5. Suggested order of work

1. Verify: log out/in, open Payroll, generate run, confirm items appear from employees.
2. Add payroll history (list past runs, view items).
3. Add edit for allowances/deductions/tax before lock.
4. Restrict route and/or RLS by role if needed.
