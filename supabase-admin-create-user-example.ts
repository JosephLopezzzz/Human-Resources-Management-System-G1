// This file is just documentation for your Supabase Edge Function code.
// Copy the handler below into a Supabase Edge Function named `admin-create-user`.
//
// In your Supabase project:
// 1. Install the Supabase CLI and log in.
// 2. Run: supabase functions new admin-create-user
// 3. Replace the generated index.ts contents with the handler below.
// 4. In the Supabase dashboard, add SUPABASE_SERVICE_ROLE_KEY as an env var for Edge Functions.
// 5. Deploy: supabase functions deploy admin-create-user

/*
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  // Verify the caller is an authenticated user.
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only allow users with role: "admin" in metadata to create new users.
  const role = (user.user_metadata?.role as string | undefined) ?? "";
  if (role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null) as
    | { email?: string; password?: string; name?: string; role?: string }
    | null;

  if (!body?.email || !body?.password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, password, name, role: newRole } = body;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name ?? "User",
      role: newRole ?? "user",
    },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
*/

