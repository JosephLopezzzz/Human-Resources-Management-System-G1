-- Security Hardening Batch (2026-03-22)
-- This migration implements granular RLS policies for core system tables.

-- 1. Enable RLS on all sensitive tables
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;

-- 2. Audit Logs: Restrict to Admins and Compliance Officers
DROP POLICY IF EXISTS "audit_logs_select_authorized" ON public.audit_logs;
CREATE POLICY "audit_logs_select_authorized"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'compliance_officer')
);

-- 3. Employees: Sensitive data protection
-- Users can see their own full record. Authorized roles see all.
DROP POLICY IF EXISTS "employees_select_owner_or_authorized" ON public.employees;
CREATE POLICY "employees_select_owner_or_authorized"
ON public.employees FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'finance_manager', 'payroll_officer', 'payroll')
);

-- Management permissions for Employee table
DROP POLICY IF EXISTS "employees_modify_authorized" ON public.employees;
CREATE POLICY "employees_modify_authorized"
ON public.employees FOR ALL TO authenticated
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr')
);

-- 4. Attendance: Self-service isolation
DROP POLICY IF EXISTS "attendance_logs_select_owner_or_authorized" ON public.attendance_logs;
CREATE POLICY "attendance_logs_select_owner_or_authorized"
ON public.attendance_logs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager')
);

DROP POLICY IF EXISTS "attendance_logs_modify_owner_or_authorized" ON public.attendance_logs;
CREATE POLICY "attendance_logs_modify_owner_or_authorized"
ON public.attendance_logs FOR ALL TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr')
);

-- 5. Leave Requests: Self-service isolation
DROP POLICY IF EXISTS "leave_requests_select_owner_or_authorized" ON public.leave_requests;
CREATE POLICY "leave_requests_select_owner_or_authorized"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager')
);

DROP POLICY IF EXISTS "leave_requests_modify_owner_or_authorized" ON public.leave_requests;
CREATE POLICY "leave_requests_modify_owner_or_authorized"
ON public.leave_requests FOR ALL TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager')
);

-- 6. Leave Balances: Self-service only
DROP POLICY IF EXISTS "leave_balances_select_owner_or_authorized" ON public.leave_balances;
CREATE POLICY "leave_balances_select_owner_or_authorized"
ON public.leave_balances FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr')
);

-- 7. Departments: Management only for WRITE
DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated"
ON public.departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "departments_modify_authorized" ON public.departments;
CREATE POLICY "departments_modify_authorized"
ON public.departments FOR ALL TO authenticated
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr')
);
