import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type PayrollRunStatus = "draft" | "processing" | "locked";
export type PayrollItemStatus = "approved" | "pending" | "draft";

export type PayrollRun = {
  id: string;
  code: string;
  period_start: string;
  period_end: string;
  status: PayrollRunStatus;
};

export type PayrollItem = {
  id: string;
  run_id: string;
  user_id: string;
  user_email: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  tax: number;
  net_pay: number;
  status: PayrollItemStatus;
};

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const code = `PAY-${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    code,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

export function usePayroll() {
  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ["payroll_runs", "current"],
    queryFn: async () => {
      const { code } = getCurrentPeriod();
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("code", code)
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] as PayrollRun | undefined;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["payroll_items", runsQuery.data?.id ?? "none"],
    enabled: !!runsQuery.data?.id,
    queryFn: async () => {
      if (!runsQuery.data?.id) return [] as PayrollItem[];
      const { data, error } = await supabase
        .from("payroll_items")
        .select("*")
        .eq("run_id", runsQuery.data.id)
        .order("user_email", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PayrollItem[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { code, period_start, period_end } = getCurrentPeriod();

      // Check if run already exists
      const { data: existing, error: checkError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("code", code)
        .limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return existing[0] as PayrollRun;
      }

      // Simple example: create run without auto-calculation.
      const { data, error } = await supabase
        .from("payroll_runs")
        .insert({
          code,
          period_start,
          period_end,
          status: "draft",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as PayrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_runs", "current"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_items"] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const run = runsQuery.data;
      if (!run) return;
      const { error } = await supabase
        .from("payroll_runs")
        .update({ status: "locked" })
        .eq("id", run.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_runs", "current"] });
    },
  });

  return {
    run: runsQuery.data,
    runLoading: runsQuery.isLoading,
    runError: runsQuery.error,
    items: itemsQuery.data ?? [],
    itemsLoading: itemsQuery.isLoading,
    itemsError: itemsQuery.error,
    generateRun: generateMutation.mutateAsync,
    generating: generateMutation.isPending,
    lockRun: lockMutation.mutateAsync,
    locking: lockMutation.isPending,
  };
}

