-- Migration: Add allowance and deduction components to employees
-- Date: 2026-03-26

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS allowances NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deductions NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.employees.allowances IS 'Monthly fixed allowances for the employee';
COMMENT ON COLUMN public.employees.deductions IS 'Standard monthly fixed deductions for the employee';
