import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type AuditLog = {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name?: string | null;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
};

export function useAuditLogs(search: string, category: string) {
  return useQuery({
    queryKey: ["audit_logs", { search, category }],
    queryFn: async () => {
      // Step 1: fetch audit logs (no FK join to avoid schema dependency)
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

      const logs = (data ?? []) as any[];

      // Step 2: look up employee names for unique actor_ids (best-effort, won't fail)
      const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};

      if (actorIds.length > 0) {
        try {
          const { data: empData } = await supabase
            .from("employees")
            .select("id, first_name, last_name")
            .in("id", actorIds);

          if (empData) {
            for (const emp of empData) {
              if (emp.id) {
                nameMap[emp.id] = `${emp.first_name} ${emp.last_name}`.trim();
              }
            }
          }
        } catch {
          // If name lookup fails, we still return logs — just without names
        }
      }

      return logs.map((log) => ({
        ...log,
        actor_name: log.actor_id ? nameMap[log.actor_id] ?? null : null,
      })) as AuditLog[];
    },
  });
}

