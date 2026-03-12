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
  try {
    const { data, error } = await supabase.functions.invoke<TData>(name, {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      const anyErr = error as unknown as {
        name?: unknown;
        message?: unknown;
        context?: unknown;
      };
      const errName = typeof anyErr?.name === "string" ? anyErr.name : "EdgeFunctionError";
      const errMsg = typeof anyErr?.message === "string" ? anyErr.message : "Request failed.";
      const ctx = anyErr?.context as
        | { status?: number; statusText?: string; body?: unknown; headers?: unknown }
        | undefined;

      const statusPart =
        typeof ctx?.status === "number"
          ? `HTTP ${ctx.status}${typeof ctx.statusText === "string" ? ` (${ctx.statusText})` : ""}`
          : null;

      const bodyPart =
        ctx?.body != null
          ? (() => {
              try {
                return typeof ctx.body === "string" ? ctx.body : JSON.stringify(ctx.body);
              } catch {
                return String(ctx.body);
              }
            })()
          : null;

      const extra = [statusPart, bodyPart].filter(Boolean).join("\n");
      const combined = extra ? `${errName}: ${errMsg}\n\n${extra}` : `${errName}: ${errMsg}`;
      return { data: null, errorMessage: combined };
    }

    return { data: (data ?? null) as TData | null, errorMessage: null };
  } catch (err) {
    const urlHint = `Tried to reach: ${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${name}`;
    const localHint =
      supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
        ? "It looks like you're pointing to a local Supabase URL. Make sure Supabase is running (e.g. `supabase start`) OR switch VITE_SUPABASE_URL to your hosted project URL."
        : "Make sure VITE_SUPABASE_URL points to your hosted project (format: https://YOUR_PROJECT_REF.supabase.co) and has no trailing slash.";
    const deployHint =
      !supabaseUrl.includes("localhost") && !supabaseUrl.includes("127.0.0.1")
        ? "If using a hosted project, deploy the Edge Function: `supabase functions deploy " +
          (name.includes("/") ? name.split("/")[0] : name) +
          "` (after `supabase login` and `supabase link --project-ref YOUR_REF`)."
        : "";
    const isFetchErr =
      err instanceof TypeError && (err.message === "Failed to fetch" || err.message?.includes("fetch"));
    const isFunctionsFetchErr =
      err instanceof Error &&
      (err.name === "FunctionsFetchError" || err.message?.includes("Failed to send a request to the Edge Function"));
    const msg =
      isFetchErr || isFunctionsFetchErr
        ? [
            err instanceof Error ? err.message : "Could not reach Edge Function.",
            "",
            urlHint,
            localHint,
            deployHint,
          ]
            .filter(Boolean)
            .join("\n\n")
        : err instanceof Error
          ? err.message
          : "Network error.";
    return { data: null, errorMessage: msg };
  }
}
