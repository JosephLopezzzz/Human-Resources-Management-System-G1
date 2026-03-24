import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/useAuth";

export type AuditCategory = "auth" | "employee" | "payroll" | "leave" | "system";

export const useAudit = () => {
  const { user } = useAuth();

  const logEvent = async (
    action: string,
    category: AuditCategory,
    entityType: string,
    entityId?: string,
    metadata: any = {}
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_email: user.email,
        action,
        category,
        entity_type: entityType,
        entity_id: entityId,
        metadata: {
          ...metadata,
          user_agent: navigator.userAgent,
          url: window.location.href,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Critical Security: Failed to log audit event:", err);
    }
  };

  return { logEvent };
};
