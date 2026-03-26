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

export type PerformanceParticipant = {
  id: string;
  cycle_id: string;
  employee_id: string;
  score: number;
  rating: string | null;
  status: "pending" | "in_progress" | "completed" | "approved";
  evaluated_by: string | null;
  evaluated_at: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
  };
};

export type PerformanceScore = {
  id: string;
  participant_id: string;
  kpi_id: string;
  score: number;
  notes: string | null;
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

export function useParticipants(cycleId: string | null) {
  return useQuery({
    queryKey: ["performance_participants", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_participants")
        .select("*, employee:employees(first_name, last_name, email, department_id)")
        .eq("cycle_id", cycleId!);
      if (error) throw error;
      return (data ?? []) as PerformanceParticipant[];
    },
  });
}

export function useParticipantScores(participantId: string | null) {
  return useQuery({
    queryKey: ["performance_scores", participantId],
    enabled: !!participantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_scores")
        .select("*")
        .eq("participant_id", participantId!);
      if (error) throw error;
      return (data ?? []) as PerformanceScore[];
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

  const addParticipant = useMutation({
    mutationFn: async (payload: { cycleId: string; employeeId: string }) => {
      const { error } = await supabase.from("performance_participants").insert({
        cycle_id: payload.cycleId,
        employee_id: payload.employeeId,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["performance_participants", variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ["review_cycles"] });
    },
  });

  const updateScore = useMutation({
    mutationFn: async (payload: {
      participantId: string;
      kpiId: string;
      score: number;
      notes?: string;
    }) => {
      const { error } = await supabase.from("performance_scores").upsert({
        participant_id: payload.participantId,
        kpi_id: payload.kpiId,
        score: payload.score,
        notes: payload.notes,
      }, { onConflict: "participant_id,kpi_id" });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["performance_scores", variables.participantId] });
    },
  });

  return {
    createCycle: createCycle.mutateAsync,
    creatingCycle: createCycle.isPending,
    addParticipant: addParticipant.mutateAsync,
    addingParticipant: addParticipant.isPending,
    updateScore: updateScore.mutateAsync,
    updatingScore: updateScore.isPending,
  };
}

