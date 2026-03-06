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

  // Role hierarchy: only System Administrator and HR Manager can create users;
  // they may only assign roles below them.
  const creatorRoleRaw = (user.user_metadata?.role as string | undefined) ?? "";
  const creatorRole = creatorRoleRaw.trim().toLowerCase();
  const isSystemAdmin = creatorRole === "admin" || creatorRole === "system_admin" || creatorRole === "super_admin";
  const isHrManager = creatorRole === "hr" || creatorRole === "hr_manager";

  if (!isSystemAdmin && !isHrManager) {
    return new Response(JSON.stringify({ error: "Forbidden: only System Administrator or HR Manager can create users" }), {
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
  const assignedRole = (newRole ?? "employee").trim().toLowerCase();

  // HR Manager can only assign: hr_officer, department_manager, employee
  const hrManagerAllowedRoles = ["hr_officer", "department_manager", "employee"];
  if (isHrManager && !hrManagerAllowedRoles.includes(assignedRole)) {
    return new Response(
      JSON.stringify({ error: "HR Manager can only assign HR Officer, Department Manager, or Employee" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Valid role keys (system_admin can assign any of these)
  const validRoles = ["system_admin", "hr_manager", "hr_officer", "payroll_officer", "finance_manager", "department_manager", "employee"];
  if (!validRoles.includes(assignedRole)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: name ?? "User",
      role: assignedRole,
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
        role_assigned: assignedRole,
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
