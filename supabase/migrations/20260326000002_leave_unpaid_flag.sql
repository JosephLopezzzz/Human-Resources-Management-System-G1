-- Migration: Add is_unpaid flag to leave_types
-- Date: 2026-03-26

ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS is_unpaid BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.leave_types.is_unpaid IS 'If true, leave days of this type will be deducted from payroll';

-- Seed example: Update Leave Without Pay (LWOP) if it exists
UPDATE public.leave_types SET is_unpaid = true WHERE code IN ('LWOP', 'UNPAID');
