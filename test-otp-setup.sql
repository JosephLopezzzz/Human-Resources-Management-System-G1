-- Test OTP Setup Script
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check if otp_codes table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'otp_codes'
) as table_exists;

-- 2. If table doesn't exist, create it
-- (Run the migration file content if this returns false)

-- 3. Test OTP function (manual test)
SELECT public.get_email_for_login('test@example.com');

-- 4. Check current OTP codes (should be empty initially)
SELECT COUNT(*) as total_otps FROM public.otp_codes;

-- 5. Clean up any old test data
DELETE FROM public.otp_codes WHERE created_at < now() - interval '1 day';
