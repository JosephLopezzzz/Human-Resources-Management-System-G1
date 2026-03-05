-- Fix payroll_runs and payroll_items RLS policies for authenticated users
-- Run this in Supabase Dashboard > SQL Editor if you see "Failed to load current run"

-- Drop existing restrictive policies if they block SELECT (optional - only if they exist)
-- You may need to adjust policy names based on your setup

-- Allow all authenticated users to SELECT from payroll_runs
DROP POLICY IF EXISTS "payroll_runs_select_authenticated" ON public.payroll_runs;
CREATE POLICY "payroll_runs_select_authenticated"
ON public.payroll_runs
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to SELECT from payroll_items
DROP POLICY IF EXISTS "payroll_items_select_authenticated" ON public.payroll_items;
CREATE POLICY "payroll_items_select_authenticated"
ON public.payroll_items
FOR SELECT
TO authenticated
USING (true);
