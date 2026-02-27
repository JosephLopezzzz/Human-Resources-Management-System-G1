import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type ReviewCycleStatus = "active" | "pending" | "approved";

export type ReviewCycle = {
  id: string;
  code: string;
  name: string;
  period: string;
  status: ReviewCycleStatus;
  completion: number;
  participants: number;
};

export type KpiDefinition = {
  id: string;
  code: string;
  name: string;
  department: string;
  weight: number;
  target: string;
};

export function useReviewCycles() {
  return useQuery({
    queryKey: ["review_cycles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cycles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewCycle[];
    },
  });
}

export function useKpis() {
  return useQuery({
    queryKey: ["kpi_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_definitions")
        .select("*")
        .order("department", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KpiDefinition[];
    },
  });
}

export function usePerformanceMutations() {
  const queryClient = useQueryClient();

  const createCycle = useMutation({
    mutationFn: async (payload: {
      code: string;
      name: string;
      period: string;
    }) => {
      const { error } = await supabase.from("review_cycles").insert({
        code: payload.code,
        name: payload.name,
        period: payload.period,
        status: "pending",
        completion: 0,
        participants: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_cycles"] });
    },
  });

  return {
    createCycle: createCycle.mutateAsync,
    creatingCycle: createCycle.isPending,
  };
}

