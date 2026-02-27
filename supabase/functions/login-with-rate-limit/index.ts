import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const client = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type LoginBody = {
  email?: string;
  password?: string;
};

function getIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    null
  );
}

const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const email = body?.email?.toLowerCase().trim();
  const password = body?.password;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getIp(req);
  const identifier = email;

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Count failures in the last window for this identifier + IP.
  const { data: recent, error: readError } = await client
    .from("audit_logs")
    .select("id")
    .eq("category", "auth")
    .eq("action", "LOGIN_FAILED")
    .eq("actor_email", email)
    .gte("timestamp", windowStart);

  if (readError) {
    return new Response(JSON.stringify({ error: "Login temporarily unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const failures = recent?.length ?? 0;

  if (failures >= MAX_FAILURES) {
    return new Response(
      JSON.stringify({ error: "Too many failed attempts. Please wait and try again." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !data.session) {
    // Best-effort audit of login failure.
    await client
      .from("audit_logs")
      .insert({
        actor_email: email,
        action: "LOGIN_FAILED",
        category: "auth",
        entity_type: "Auth",
        entity_id: null,
        ip_address: ip,
      })
      .catch(() => {});

    return new Response(JSON.stringify({ error: "Invalid email or password." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Successful login: audit success.
  await client
    .from("audit_logs")
    .insert({
      actor_user_id: data.user?.id ?? null,
      actor_email: email,
      action: "LOGIN_SUCCESS",
      category: "auth",
      entity_type: "Auth",
      entity_id: null,
      ip_address: ip,
    })
    .catch(() => {});

  return new Response(
    JSON.stringify({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: data.user,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

