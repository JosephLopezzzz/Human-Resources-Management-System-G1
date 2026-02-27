import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type AuditLog = {
  id: string;
  timestamp: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
};

export function useAuditLogs(search: string, category: string) {
  return useQuery({
    queryKey: ["audit_logs", { search, category }],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200);

      if (category !== "all") {
        query = query.eq("category", category);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `action.ilike.${term},actor_email.ilike.${term},entity_type.ilike.${term}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}

