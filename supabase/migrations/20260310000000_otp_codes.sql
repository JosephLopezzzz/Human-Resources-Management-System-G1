-- Create OTP codes table for password reset functionality
-- Run in Supabase SQL Editor or via migration

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code ON public.otp_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for Edge Function)
-- No policies needed for service_role as it bypasses RLS

-- Clean up expired OTPs (optional cleanup function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.otp_codes 
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- Grant usage to authenticated (optional, for cleanup)
REVOKE ALL ON FUNCTION public.cleanup_expired_otps() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otps() TO authenticated;
