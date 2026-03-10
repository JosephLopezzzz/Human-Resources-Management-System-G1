-- Database Test for OTP System
-- Run this in Supabase SQL Editor

-- 1. Check if all required tables exist
SELECT 
    'user_login' as table_name, 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_login') as exists
UNION ALL
SELECT 
    'otp_codes' as table_name, 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_codes') as exists
UNION ALL
SELECT 
    'employees' as table_name, 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') as exists;

-- 2. Test OTP codes table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'otp_codes' 
ORDER BY ordinal_position;

-- 3. Test get_email_for_login function
SELECT public.get_email_for_login('test@example.com');

-- 4. Clean up test data
DELETE FROM public.otp_codes WHERE email LIKE '%test%' OR email LIKE '%example%';

-- 5. Manual OTP test (insert and verify)
-- Insert test OTP
INSERT INTO public.otp_codes (email, code, expires_at) 
VALUES ('test@example.com', '123456', now() + interval '10 minutes');

-- Verify it was inserted
SELECT * FROM public.otp_codes WHERE email = 'test@example.com';

-- Clean up test data
DELETE FROM public.otp_codes WHERE email = 'test@example.com';

-- 6. Check Edge Function logs (you'll need to check dashboard for this)
-- The logs should show OTP generation and sending attempts
