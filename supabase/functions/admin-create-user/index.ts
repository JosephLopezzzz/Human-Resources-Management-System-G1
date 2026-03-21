// @ts-nocheck
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

// Password validation function
function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    };
  }

  return { isValid: true };
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email using Resend
async function sendOTP(email: string, otp: string): Promise<boolean> {
  try {
    // Check if Resend API key is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found in environment variables");
      // Fallback: just log for development
      console.log(`[DEV MODE] OTP ${otp} for ${email}`);
      return true;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", // Use Resend's default for testing
        to: [email],
        subject: "Your OTP Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">OTP Verification</h2>
            <p>Your verification code is:</p>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`OTP ${otp} sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return false;
  }
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizePath(pathname: string) {
  // Supabase edge runtime may pass different shapes depending on environment, for example:
  // - "/create-user"
  // - "/admin-create-user/create-user"
  // - "/functions/v1/admin-create-user/create-user"
  // Normalize all of them to "/create-user" style routes.
  const candidates = ["/functions/v1/admin-create-user", "/admin-create-user"];
  for (const base of candidates) {
    if (pathname === base) return "/";
    if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  }
  return pathname;
}

/** Build employee record for Employees module display. */
function buildEmployeeRow(
  email: string,
  name: string,
  username: string,
  assignedRole: string,
  userId?: string
) {
  const nameParts = (name ?? username ?? "User").trim().split(/\s+/);
  const first = nameParts[0] || username || "User";
  const last = nameParts.slice(1).join(" ") || "User";
  const empCode = userId
    ? `EMP-${userId.slice(-8).toUpperCase()}`
    : `EMP-${username.slice(-8).padStart(8, "0").toUpperCase()}`;
  const joinDate = new Date().toISOString().slice(0, 10);

  return {
    email,
    employee_code: empCode,
    first_name: first,
    last_name: last,
    department_id: null,
    position: assignedRole.replace(/_/g, " "),
    status: "regular" as const,
    join_date: joinDate,
    salary_amount: 0,
    salary_currency: "PHP",
  };
}

async function syncEmployeeToModule(
  email: string,
  name: string,
  username: string,
  assignedRole: string,
  userId?: string
) {
  const row = buildEmployeeRow(email, name, username, assignedRole, userId);
  try {
    const { data: existing } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await adminClient
        .from("employees")
        .update({
          first_name: row.first_name,
          last_name: row.last_name,
          position: row.position,
        })
        .eq("id", existing.id);
    } else {
      await adminClient.from("employees").insert(row);
    }
  } catch (e) {
    console.warn("Employee sync failed (table may not exist or schema differs):", e);
  }
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  // Supabase admin API doesn't provide a direct lookup by email in all environments,
  // so we page through users. This is acceptable for small/medium orgs and keeps the
  // function self-contained.
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data?.users?.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match?.id) return match.id;
    if (!data?.users || data.users.length < perPage) break;
  }
  return null;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  // Handle CORS preflight so the browser can call this function from your app origin
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // OTP send endpoint
  if (path === "/send-otp" && req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return jsonResponse(JSON.stringify({ error: "Missing bearer token" }), 401, req);
    }

    // Verify the caller is an authorized admin/hr
    const { data: callerData, error: callerError } = await adminClient.auth.getUser(token);
    const caller = callerData?.user;

    if (callerError || !caller) {
      return jsonResponse(JSON.stringify({ error: "Unauthorized" }), 401, req);
    }

    const callerRoleRaw = (caller.user_metadata?.role as string | undefined) ?? "";
    const callerRole = callerRoleRaw.trim().toLowerCase();
    const isAuthorized = callerRole === "admin" || callerRole === "system_admin" || callerRole === "hr_manager" || callerRole === "hr";

    if (!isAuthorized) {
      return jsonResponse(JSON.stringify({ error: "Forbidden: only admins or HR can send OTPs" }), 403, req);
    }

    const { email } = await req.json();

    if (!email) {
      return jsonResponse(JSON.stringify({ error: "Email is required" }), 400, req);
    }

    const otp = generateOTP();
    const sent = await sendOTP(email, otp);

    if (sent) {
      // Store OTP in database
      await adminClient.from("otp_codes").upsert({
        email: email,
        code: otp,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

      return jsonResponse(
        JSON.stringify({
          message: "OTP sent successfully",
        }),
        200,
        req,
      );
    } else {
      return jsonResponse(JSON.stringify({ error: "Failed to send OTP" }), 500, req);
    }
  }

  // OTP verification endpoint
  if (path === "/verify-otp" && req.method === "POST") {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return jsonResponse(JSON.stringify({ error: "Email and OTP are required" }), 400, req);
    }

    try {
      // Check OTP in database
      const { data: otpRecord, error: otpError } = await adminClient
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("code", otp)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (otpError || !otpRecord) {
        return jsonResponse(JSON.stringify({ error: "Invalid or expired OTP" }), 400, req);
      }

      // Delete used OTP
      await adminClient.from("otp_codes").delete().eq("email", email).eq("code", otp);

      // Generate password reset token
      const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: email,
        options: {
          redirectTo: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/reset-password`,
        },
      });

      if (resetError) {
        return jsonResponse(JSON.stringify({ error: "Failed to generate reset link" }), 500, req);
      }

      return jsonResponse(
        JSON.stringify({
          message: "OTP verified successfully",
          resetLink: resetData.properties?.action_link,
        }),
        200,
        req,
      );
    } catch (_error) {
      return jsonResponse(JSON.stringify({ error: "OTP verification failed" }), 500, req);
    }
  }

  // User creation endpoint (accept "/" for backward compatibility)
  if ((path === "/create-user" || path === "/") && req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return jsonResponse(JSON.stringify({ error: "Missing bearer token" }), 401, req);
    }

    // Verify the caller is an authenticated user using the service client.
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      const detail = userError?.message ?? "No user";
      return jsonResponse(
        JSON.stringify({
          error: "Unauthorized: token invalid or expired. Log out, log back in, and try again.",
          detail,
        }),
        401,
        req,
      );
    }

    // --- RBAC & HIERARCHY CHECK ---
    const callerRoleRaw = (user.user_metadata?.role as string | undefined) ?? "";
    const callerRole = callerRoleRaw.trim().toLowerCase();
    const isAdmin = callerRole === "system_admin" || callerRole === "admin";
    const isHR = callerRole === "hr_manager" || callerRole === "hr";

    if (!isAdmin && !isHR) {
      return jsonResponse(JSON.stringify({ error: "Forbidden: only admins or HR can create users" }), 403, req);
    }

    // --- ENFORCE MFA FOR SYSTEM ADMINS (Strongly Recommended) ---
    // Note: This requires the admin to have enrolled in MFA and be logged in with AAL2.
    // If you wish to make this strict, uncomment the block below.
    /*
    const aal = (user.app_metadata?.aal as string | undefined) ?? "aal1";
    if (isAdmin && aal !== "aal2") {
      return jsonResponse(
        JSON.stringify({ error: "Forbidden: MFA required for administrative actions" }),
        403,
        req
      );
    }
    */
    // ------------------------------------------------------------
    // ------------------------------

    const body = (await req.json().catch(() => null)) as
      | {
          email?: string;
          password?: string;
          name?: string;
          role?: string;
          username?: string;
          otp?: string;
        }
      | null;

    if (!body?.email || !body?.password || !body?.otp) {
      return jsonResponse(JSON.stringify({ error: "Missing email, password, or OTP" }), 400, req);
    }

    const { email, password, name, role: newRole, username: rawUsername, otp } = body;

    // Verify OTP
    const { data: otpRecord, error: otpError } = await adminClient
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("code", otp)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return jsonResponse(JSON.stringify({ error: "Invalid or expired OTP" }), 400, req);
    }

    // Delete used OTP
    await adminClient.from("otp_codes").delete().eq("email", email).eq("code", otp);

    const pw = validatePassword(password);
    if (!pw.isValid) {
      return jsonResponse(JSON.stringify({ error: pw.error ?? "Invalid password" }), 400, req);
    }

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

    // --- HIERARCHY CHECK ---
    // HR Managers can only assign low-level roles.
    if (isHR && !isAdmin) {
      const hrAllowed = ["hr_officer", "department_manager", "compliance_officer", "employee"];
      if (!hrAllowed.includes(assignedRole)) {
        return jsonResponse(
          JSON.stringify({ error: "Forbidden: HR Manager cannot assign this administrative role" }),
          403,
          req
        );
      }
    }
    // -----------------------

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
      // If the email already exists, "accept" it by updating the existing account
      // (useful when you want to re-provision roles/passwords before OTP enrollment).
      const msg = (error.message ?? "").toLowerCase();
      const isDuplicate =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("user already registered") ||
        msg.includes("duplicate");

      if (isDuplicate) {
        const existingId = await findUserIdByEmail(email);
        if (!existingId) {
          return jsonResponse(
            JSON.stringify({
              error:
                "A user with this email already exists, but the system could not locate the account to update. Try again or contact an administrator.",
            }),
            409,
            req,
          );
        }

        // --- PROTECTION: Do not allow updating existing system_admin accounts ---
        const { data: existingData, error: getError } = await adminClient.auth.admin.getUserById(existingId);
        
        if (getError) {
          console.error("Error fetching existing user:", getError);
        }

        const existingRole = (existingData?.user?.user_metadata?.role as string | undefined) ?? "";
        if (existingRole === "system_admin" || existingRole === "admin") {
          return jsonResponse(
            JSON.stringify({ error: "Forbidden: Administrative accounts can only be updated via SQL by a Database Owner" }),
            403,
            req
          );
        }
        // ------------------------------------------------------------------------

        const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(existingId, {
          password,
          email_confirm: true,
          user_metadata: {
            name: name ?? "User",
            role: assignedRole,
            username,
          },
        });

        if (updateError) {
          return jsonResponse(JSON.stringify({ error: updateError.message }), 400, req);
        }

        // Audit log for update
        const ip =
          req.headers.get("x-forwarded-for") ??
          req.headers.get("cf-connecting-ip") ??
          req.headers.get("x-real-ip") ??
          null;

        try {
          await adminClient.from("user_login").upsert(
            { email, username_lower: username },
            { onConflict: "username_lower" }
          );
        } catch {
          /* Username mapping failures should not break the main flow. */
        }

        await syncEmployeeToModule(
          email,
          name ?? "User",
          username,
          assignedRole,
          updated?.user?.id ?? existingId
        );

        try {
          await adminClient.from("audit_logs").insert({
            actor_user_id: user.id,
            actor_email: user.email,
            action: "ADMIN_UPDATE_USER",
            category: "auth",
            entity_type: "User",
            entity_id: updated?.user?.id ?? existingId,
            ip_address: ip,
            metadata: {
              role_assigned: assignedRole,
              updated_existing: true,
            },
          });
        } catch {
          /* Logging failures should not break the main flow. */
        }

        return new Response(JSON.stringify({ user: updated?.user, updated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        });
      }

      return jsonResponse(JSON.stringify({ error: error.message }), 400, req);
    }

    try {
      await adminClient.from("user_login").insert({ email, username_lower: username });
    } catch {
      // Duplicate username or table missing: log but don't fail user creation
    }

    await syncEmployeeToModule(
      email,
      name ?? "User",
      username,
      assignedRole,
      data.user?.id
    );

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? null;

    try {
      await adminClient.from("audit_logs").insert({
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
      });
    } catch {
      /* Logging failures should not break the main flow. */
    }

    return new Response(JSON.stringify({ user: data.user, updated: false }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  // Default response for other paths
    return jsonResponse(JSON.stringify({ error: "Endpoint not found" }), 404, req);
  } catch (err) {
    console.error("Global Edge Function Error:", err);
    return jsonResponse(
      JSON.stringify({ 
        error: "Internal Server Error", 
        detail: err instanceof Error ? err.message : String(err) 
      }), 
      500, 
      req
    );
  }
});
