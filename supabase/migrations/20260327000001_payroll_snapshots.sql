-- Migration: Payroll Data Snapshots (Phase 1)
-- Date: 2026-03-27

-- 1. Add snapshot columns to payroll_items
ALTER TABLE IF EXISTS public.payroll_items 
ADD COLUMN IF NOT EXISTS employee_name text,
ADD COLUMN IF NOT EXISTS department_name text,
ADD COLUMN IF NOT EXISTS job_title text;

-- 2. Update existing records (Best effort)
-- This attempts to backfill names if they are still the same in the employees table.
UPDATE public.payroll_items pi
SET employee_name = TRIM(e.first_name || ' ' || e.last_name),
    job_title = e.position
FROM public.employees e
WHERE pi.user_id = e.id AND pi.employee_name IS NULL;
