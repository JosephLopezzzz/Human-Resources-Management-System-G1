-- Phase 3 Prevention & Controls (2026-03-24)
-- This migration implements the Maker-Checker status for payroll.

-- 1. Update payroll_runs status check constraint
-- PostgreSQL doesn't allow direct modification of CHECK constraints easily without dropping.
ALTER TABLE public.payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_status_check 
CHECK (status IN ('draft', 'processing', 'review_pending', 'locked'));

-- 2. Add metadata to track the 'Maker' (who submitted for review)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_runs' AND column_name='submitted_by_id') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN submitted_by_id uuid REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_runs' AND column_name='submitted_at') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN submitted_at timestamptz;
    END IF;
END $$;

-- 3. RLS for 'Review' status
-- Only Finance Managers and Admins can move a run from 'review_pending' to 'locked'
-- And they CANNOT be the same person as 'submitted_by_id'
DROP POLICY IF EXISTS "payroll_runs_approve_authorized" ON public.payroll_runs;
CREATE POLICY "payroll_runs_approve_authorized"
ON public.payroll_runs FOR UPDATE TO authenticated
USING (
    status = 'review_pending' 
    AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'finance_manager')
)
WITH CHECK (
    auth.uid() <> submitted_by_id -- THE CORE MAKER-CHECKER RULE
);
