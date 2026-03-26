-- Leave Module Columns Reconciliation (2026-03-27)
-- Fixes "Could not find the 'description' column" error.

DO $$ 
BEGIN 
    -- 1. Ensure description exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='description') THEN
        ALTER TABLE public.leave_requests ADD COLUMN description text;
    END IF;

    -- 2. Ensure user_email exists (we removed it from insert but it might be needed for select/legacy)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='user_email') THEN
        ALTER TABLE public.leave_requests ADD COLUMN user_email text;
    END IF;

    -- 3. Ensure days exists (Edge Function uses it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='days') THEN
        ALTER TABLE public.leave_requests ADD COLUMN days NUMERIC DEFAULT 1;
    END IF;

END $$;
