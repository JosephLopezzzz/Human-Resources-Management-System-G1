import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type PayrollRunStatus = "draft" | "processing" | "review_pending" | "locked";
export type PayrollItemStatus = "approved" | "pending" | "draft";

export type PayrollRun = {
  id: string;
  code: string;
  period_start: string;
  period_end: string;
  status: PayrollRunStatus;
  submitted_by_id?: string | null;
  submitted_at?: string | null;
};

export type PayrollItem = {
  id: string;
  run_id: string;
  user_id: string;
  user_email: string;
  employee_name?: string;
  department_name?: string;
  job_title?: string;
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

/** Fetch all payroll runs (for History tab). */
export function usePayrollRuns() {
  return useQuery({
    queryKey: ["payroll_runs", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollRun[];
    },
  });
}

/** Fetch items for a specific run (e.g. History tab detail). */
export function usePayrollItemsForRun(runId: string | null) {
  return useQuery({
    queryKey: ["payroll_items", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_items")
        .select("*")
        .eq("run_id", runId!)
        .order("user_email");
      if (error) throw error;
      return (data ?? []) as PayrollItem[];
    },
  });
}

export function usePayroll() {
  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ["payroll_runs", "current"],
    retry: false,
    refetchOnMount: "always",
    queryFn: async () => {
      const { code } = getCurrentPeriod();
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("code", code)
        .limit(1);
      if (error) throw error;
      // Success with no row: return undefined (no run for this period)
      if (data == null) return undefined;
      const row = Array.isArray(data) ? data[0] : data;
      return row as PayrollRun | undefined;
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

      // Get or Create the run
      let run: PayrollRun;
      const { data: existing, error: checkError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("code", code)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existing && existing.length > 0) {
        run = existing[0] as PayrollRun;
      } else {
        const { data: runData, error: runError } = await supabase
          .from("payroll_runs")
          .insert({
            code,
            period_start,
            period_end,
            status: "draft",
          })
          .select("*")
          .single();
        if (runError) throw runError;
        run = runData as PayrollRun;
      }

      // Only generate items if the run is in 'draft' status
      if (run.status !== "draft") {
        return run;
      }

      // Create, calculate, and save payroll items via Edge Function
      const { data, error: invokeError } = await supabase.functions.invoke("generate-payroll", {
        body: { runId: run.id }
      });

      if (invokeError) {
        console.error("Raw Invoke Error:", invokeError);
        throw new Error(`Framework Error: ${invokeError.message}`);
      }

      if (data && data.apiError) {
        throw new Error(`Edge Function Runtime Error: ${data.apiError}`);
      }

      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_runs", "current"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_items"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (userId: string) => {
      const run = runsQuery.data;
      if (!run) return;
      const { error } = await supabase
        .from("payroll_runs")
        .update({ 
          status: "review_pending",
          submitted_by_id: userId,
          submitted_at: new Date().toISOString()
        })
        .eq("id", run.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_runs", "current"] });
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
      queryClient.invalidateQueries({ queryKey: ["payroll_items"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const run = runsQuery.data;
      if (!run) return;
      const { error } = await supabase
        .from("payroll_runs")
        .delete()
        .eq("id", run.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_runs", "current"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_items"] });
    },
  });

  return {
    run: runsQuery.data,
    runLoading: runsQuery.isLoading,
    runError: runsQuery.error,
    refetchRun: runsQuery.refetch,
    items: itemsQuery.data ?? [],
    itemsLoading: itemsQuery.isLoading,
    itemsError: itemsQuery.error,
    generateRun: generateMutation.mutateAsync,
    generating: generateMutation.isPending,
    submitRun: submitMutation.mutateAsync,
    submitting: submitMutation.isPending,
    lockRun: lockMutation.mutateAsync,
    locking: lockMutation.isPending,
    deleteRun: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}
