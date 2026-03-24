-- Phase 2 Security Hardening (2026-03-24)
-- This migration ensures the audit_logs table exists and tightens RLS for payroll/employees.

-- 1. Create audit_logs table (if missing)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp timestamptz DEFAULT now(),
    actor_id uuid DEFAULT auth.uid(),
    actor_email text,
    action text NOT NULL,
    category text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Audit Logs: Management roles can see all logs.
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
