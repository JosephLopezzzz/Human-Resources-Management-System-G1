import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/useAuth";

export type AuditCategory = "auth" | "employee" | "payroll" | "leave" | "system";

/**
 * Standalone logging function for use in contexts where hooks cannot be called (like AuthProvider body)
 */
export const logAudit = async (
  user: any,
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
        timestamp: new Date().toISOString(),
      },
    });

    if (error) throw error;
  } catch (err) {
    // Keep internal error logging for security forensics, but remove user-facing toasts
    console.error("Critical Security: Failed to log audit event:", err);
  }
};

export const useAudit = () => {
  // We'll import useAuth dynamically or use a safer path
  // Since useAudit is used in many places, we'll keep the hook signature
  const { user } = useAuth();

  const logEvent = async (
    action: string,
    category: AuditCategory,
    entityType: string,
    entityId?: string,
    metadata: any = {}
  ) => {
    return logAudit(user, action, category, entityType, entityId, metadata);
  };

  return { logEvent };
};
