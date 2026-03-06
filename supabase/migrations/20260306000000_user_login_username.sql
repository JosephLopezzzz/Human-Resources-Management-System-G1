-- Allow login by email or username: table + RPC for resolving username -> email
-- Run in Supabase SQL Editor or via migration

CREATE TABLE IF NOT EXISTS public.user_login (
  email text NOT NULL,
  username_lower text NOT NULL UNIQUE,
  PRIMARY KEY (username_lower)
);

ALTER TABLE public.user_login ENABLE ROW LEVEL SECURITY;

-- Anon can only resolve username -> email (one row at a time via RPC)
CREATE POLICY "user_login_select_anon_for_login"
ON public.user_login FOR SELECT TO anon
USING (true);

-- Inserts only from Edge Function (service_role bypasses RLS). No policy needed for service_role.

-- RPC: returns the email to use for sign-in. Input can be email or username.
-- If input contains '@', return it as-is. Otherwise look up email by username_lower.
CREATE OR REPLACE FUNCTION public.get_email_for_login(login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  out_email text;
BEGIN
  IF login IS NULL OR trim(login) = '' THEN
    RETURN NULL;
  END IF;
  IF trim(login) LIKE '%@%' THEN
    RETURN trim(login);
  END IF;
  SELECT email INTO out_email
  FROM public.user_login
  WHERE username_lower = lower(trim(login))
  LIMIT 1;
  RETURN out_email;
END;
$$;

-- Anon can call this for login (they only get one email back for one input)
REVOKE ALL ON FUNCTION public.get_email_for_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO authenticated;
