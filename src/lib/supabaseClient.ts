import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Call an Edge Function with the session token and return parsed response so we can show the real error. */
export async function invokeFunction<TBody, TData>(
  name: string,
  accessToken: string,
  body: TBody
): Promise<{ data: TData | null; errorMessage: string | null }> {
  const url = `${supabaseUrl}/functions/v1/${name}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg =
      err instanceof TypeError && (err.message === "Failed to fetch" || err.message?.includes("fetch"))
        ? "Could not reach the server. Check that .env has VITE_SUPABASE_URL set to your hosted project (e.g. https://YOUR_PROJECT_REF.supabase.co, no trailing slash) and that you have internet access. If the app runs on http://localhost, the URL must be https."
        : err instanceof Error
          ? err.message
          : "Network error.";
    return { data: null, errorMessage: msg };
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    const errMsg = typeof obj?.error === "string" ? obj.error : null;
    const detail = typeof obj?.detail === "string" ? obj.detail : null;
    let msg = errMsg
      ? detail
        ? `${errMsg} (${detail})`
        : errMsg
      : res.statusText || `Request failed (${res.status})`;
    // Gateway 401 = request never reached our function. Tell user to deploy with CLI so verify_jwt is off.
    if (res.status === 401 && !errMsg) {
      msg =
        "The server rejected the request (401). Deploy the Edge Function with JWT verification OFF so the request reaches the function. See DEPLOY.md in the project root for exact steps.";
    }
    return { data: null, errorMessage: msg };
  }
  return { data: json as TData, errorMessage: null };
}
