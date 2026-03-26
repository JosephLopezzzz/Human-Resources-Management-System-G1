-- Migration: Expand Attendance and Leave RLS for Payroll
-- Date: 2026-03-26

-- 1. Attendance Logs: Allow payroll and finance roles to see logs for payroll processing
DROP POLICY IF EXISTS "attendance_logs_select_owner_or_authorized" ON public.attendance_logs;
CREATE POLICY "attendance_logs_select_owner_or_authorized"
ON public.attendance_logs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager', 'payroll_officer', 'payroll', 'finance_manager')
);

-- 2. Leave Requests: Allow payroll and finance roles to see requests for payroll processing
DROP POLICY IF EXISTS "leave_requests_select_owner_or_authorized" ON public.leave_requests;
CREATE POLICY "leave_requests_select_owner_or_authorized"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager', 'payroll_officer', 'payroll', 'finance_manager')
);
