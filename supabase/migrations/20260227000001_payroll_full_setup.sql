-- ============================================================
-- PAYROLL FULL SETUP - Run this entire file in Supabase SQL Editor
-- Fixes "Failed to load current run" by creating tables + RLS
-- ============================================================

-- 1. Create payroll_runs table (if missing)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'locked')),
  created_at timestamptz DEFAULT now()
);

-- 2. Create payroll_items table (if missing)
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'draft')),
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on both tables
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "payroll_runs_select_authenticated" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_insert_authenticated" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_update_authenticated" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_modify_admin_hr_only" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_modify_authorized" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_items_select_authenticated" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_insert_authenticated" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_update_authenticated" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_admin_hr_all" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_self_limited" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_modify_admin_hr_only" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_modify_authorized" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_owner_or_authorized" ON public.payroll_items;

-- 5. Payroll Runs: Everyone authenticated can see the run list, but only admins/HR/payroll can modify.
CREATE POLICY "payroll_runs_select_authenticated"
ON public.payroll_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "payroll_runs_modify_authorized"
ON public.payroll_runs FOR ALL TO authenticated 
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'payroll_officer', 'payroll')
);

-- 6. Payroll Items: Users see their own items. Admins, HR, Payroll, and Finance see all items.
CREATE POLICY "payroll_items_select_owner_or_authorized"
ON public.payroll_items FOR SELECT TO authenticated 
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'payroll_officer', 'payroll', 'finance_manager')
);

-- 7. Payroll Items Management: Restricted to System Admin and Payroll Officers.
CREATE POLICY "payroll_items_modify_authorized"
ON public.payroll_items FOR ALL TO authenticated 
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'payroll_officer', 'payroll')
);
