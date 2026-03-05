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
DROP POLICY IF EXISTS "payroll_runs_modify_admin_hr_only" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_items_select_authenticated" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_admin_hr_all" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_select_self_limited" ON public.payroll_items;
DROP POLICY IF EXISTS "payroll_items_modify_admin_hr_only" ON public.payroll_items;

-- 5. Allow all authenticated users to SELECT
CREATE POLICY "payroll_runs_select_authenticated"
ON public.payroll_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "payroll_items_select_authenticated"
ON public.payroll_items FOR SELECT TO authenticated USING (true);

-- 6. Allow authenticated users to INSERT/UPDATE payroll_runs (for Generate Payroll & Lock)
CREATE POLICY "payroll_runs_insert_authenticated"
ON public.payroll_runs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payroll_runs_update_authenticated"
ON public.payroll_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 7. Allow authenticated users to INSERT into payroll_items (for future use)
CREATE POLICY "payroll_items_insert_authenticated"
ON public.payroll_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payroll_items_update_authenticated"
ON public.payroll_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Done. Log out and back in to the app, then open Payroll and click Retry.
