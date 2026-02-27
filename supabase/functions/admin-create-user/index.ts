import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify the caller is an authenticated user using the service client.
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

  // Enforce MFA (AAL2) for this privileged operation using a user-scoped client.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: aalData, error: aalError } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || aalData.currentLevel !== "aal2") {
    return new Response(JSON.stringify({ error: "MFA required for this action" }), {
      status: 403,
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

  const body = (await req.json().catch(() => null)) as
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

  // Best-effort audit log for the successful admin create user action.
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    null;

  await adminClient
    .from("audit_logs")
    .insert({
      actor_user_id: user.id,
      actor_email: user.email,
      action: "ADMIN_CREATE_USER",
      category: "auth",
      entity_type: "User",
      entity_id: data.user?.id ?? null,
      ip_address: ip,
      metadata: {
        role_assigned: newRole ?? "user",
      },
    })
    .catch(() => {
      // Logging failures should not break the main flow.
    });

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
