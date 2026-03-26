-- Leave Module Reconciliation Patch (2026-03-27)
-- Ensures leave_requests table has correct columns and RLS allows updates.

DO $$ 
BEGIN 
    -- 1. Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='approver_id') THEN
        ALTER TABLE public.leave_requests ADD COLUMN approver_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='approver_email') THEN
        ALTER TABLE public.leave_requests ADD COLUMN approver_email text;
    END IF;

    -- 2. Harden RLS for UPDATE
    DROP POLICY IF EXISTS "leave_requests_modify_owner_or_authorized" ON public.leave_requests;
    DROP POLICY IF EXISTS "leave_requests_update_authorized" ON public.leave_requests;
    
    -- Explicitly allow managers and admins to UPDATE leave requests
    CREATE POLICY "leave_requests_update_authorized"
    ON public.leave_requests FOR UPDATE TO authenticated
    USING (
      auth.uid() = user_id 
      OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager')
    )
    WITH CHECK (
      auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager')
      OR auth.uid() = user_id
    );

    -- Ensure SELECT and INSERT still work
    DROP POLICY IF EXISTS "leave_requests_select_owner_or_authorized" ON public.leave_requests;
    CREATE POLICY "leave_requests_select_owner_or_authorized"
    ON public.leave_requests FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id 
      OR auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'admin', 'hr_manager', 'hr', 'department_manager', 'manager', 'payroll_officer', 'payroll', 'finance_manager')
    );

    DROP POLICY IF EXISTS "leave_requests_insert_owner" ON public.leave_requests;
    CREATE POLICY "leave_requests_insert_owner"
    ON public.leave_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

END $$;
