-- Phase 2 Security Hardening (2026-03-24) - RECONCILIATION PATCH
-- This script ensures the audit_logs table matches the app's expectations.

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

-- 2. Defensive Column Reconciliation
DO $$ 
BEGIN 
    -- actor_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_id uuid DEFAULT auth.uid();
    END IF;

    -- actor_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_email') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_email text;
    END IF;

    -- action
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='action') THEN
        ALTER TABLE public.audit_logs ADD COLUMN action text NOT NULL DEFAULT 'unknown_action';
    END IF;

    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='category') THEN
        ALTER TABLE public.audit_logs ADD COLUMN category text NOT NULL DEFAULT 'system';
    END IF;

    -- entity_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_type') THEN
        ALTER TABLE public.audit_logs ADD COLUMN entity_type text NOT NULL DEFAULT 'general';
    END IF;

    -- entity_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN entity_id text;
    END IF;

    -- metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='metadata') THEN
        ALTER TABLE public.audit_logs ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='timestamp') THEN
        ALTER TABLE public.audit_logs ADD COLUMN timestamp timestamptz DEFAULT now();
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Audit Logs: Management roles can see all logs.
DROP POLICY IF EXISTS "audit_logs_select_authorized" ON public.audit_logs;
CREATE POLICY "audit_logs_select_authorized"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'compliance_officer', 'hr_manager')
);

-- Deny all updates/deletes to audit logs (Immutability)
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. Employees: Harden self-editing
-- Ensure regular employees can NEVER update their own salary or role
DROP POLICY IF EXISTS "employees_update_restriction" ON public.employees;
CREATE POLICY "employees_update_restriction"
ON public.employees FOR UPDATE TO authenticated
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager')
)
WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager')
);

-- 5. Payroll Items: Ensure strict user isolation
-- Regular users can only see their own payroll items.
DROP POLICY IF EXISTS "payroll_items_select_owner_or_authorized" ON public.payroll_items;
CREATE POLICY "payroll_items_select_owner_or_authorized"
ON public.payroll_items FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'payroll_officer', 'payroll', 'finance_manager')
);
