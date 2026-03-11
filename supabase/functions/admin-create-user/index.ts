import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** CORS headers so the browser allows requests from your app (e.g. localhost:8080). Use * so it works from any origin. */
function corsHeaders(_req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: string, status: number, req: Request) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  // Handle CORS preflight so the browser can call this function from your app origin
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(JSON.stringify({ error: "Method not allowed" }), 405, req);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return jsonResponse(JSON.stringify({ error: "Missing bearer token" }), 401, req);
  }

  // Verify the caller is an authenticated user using the service client.
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    const detail = userError?.message ?? "No user";
    return jsonResponse(
      JSON.stringify({
        error: "Unauthorized: token invalid or expired. Log out, log back in, and try again.",
        detail,
      }),
      401,
      req
    );
  }

  // Role hierarchy: only System Administrator can create users.
  const creatorRoleRaw = (user.user_metadata?.role as string | undefined) ?? "";
  const creatorRole = creatorRoleRaw.trim().toLowerCase();
  const isSystemAdmin = creatorRole === "admin" || creatorRole === "system_admin" || creatorRole === "super_admin";

  if (!isSystemAdmin) {
    return jsonResponse(
      JSON.stringify({ error: "Forbidden: only System Administrator can create users" }),
      403,
      req
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string; role?: string; username?: string }
    | null;

  if (!body?.email || !body?.password) {
    return jsonResponse(JSON.stringify({ error: "Missing email or password" }), 400, req);
  }

  const { email, password, name, role: newRole, username: rawUsername } = body;
  const assignedRole = (newRole ?? "employee").trim().toLowerCase();
  const username = (rawUsername ?? name ?? "user").trim().toLowerCase().replace(/\s+/g, "_") || "user";

  const validRoles = [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ];
  if (!validRoles.includes(assignedRole)) {
    return jsonResponse(JSON.stringify({ error: "Invalid role" }), 400, req);
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name ?? "User",
      role: assignedRole,
      username,
    },
  });

  if (error) {
    return jsonResponse(JSON.stringify({ error: error.message }), 400, req);
  }

  await adminClient
    .from("user_login")
    .insert({ email, username_lower: username })
    .catch(() => {
      // Duplicate username or table missing: log but don't fail user creation
    });

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
        role_assigned: assignedRole,
      },
    })
    .catch(() => {
      // Logging failures should not break the main flow.
    });

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
});
