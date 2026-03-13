ALTER TABLE public.attendance_logs
ADD COLUMN IF NOT EXISTS lunch_start_time timestamptz,
ADD COLUMN IF NOT EXISTS lunch_end_time timestamptz;
