import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

const leaveTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
});

const leaveRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_email: z.string().email(),
  leave_type_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  days: z.number(),
  status: z.enum(["pending", "approved", "rejected"]),
  approver_id: z.string().uuid().nullable(),
  approver_email: z.string().email().nullable(),
  leave_types: leaveTypeSchema.optional().nullable(),
});

const leaveBalanceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  leave_type_id: z.string().uuid(),
  total_days: z.number(),
  used_days: z.number(),
  pending_days: z.number(),
  leave_types: leaveTypeSchema.optional().nullable(),
});

export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return z.array(leaveTypeSchema).parse(data ?? []);
    },
  });
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, leave_types(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return z.array(leaveRequestSchema).parse(data ?? []);
    },
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ["leave_balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*, leave_types(*)");
      if (error) throw error;
      return z.array(leaveBalanceSchema).parse(data ?? []);
    },
  });
}

export function useLeaveMutations() {
  const queryClient = useQueryClient();

  const createRequest = useMutation({
    mutationFn: async (payload: {
      userId: string;
      email: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days: number;
    }) => {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: payload.userId,
        user_email: payload.email,
        leave_type_id: payload.leaveTypeId,
        start_date: payload.startDate,
        end_date: payload.endDate,
        days: payload.days,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave_balances"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (opts: {
      id: string;
      status: "approved" | "rejected";
      approverId: string;
      approverEmail: string | null;
    }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: opts.status,
          approver_id: opts.approverId,
          approver_email: opts.approverEmail,
        })
        .eq("id", opts.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave_balances"] });
    },
  });

  return {
    createRequest: createRequest.mutateAsync,
    creating: createRequest.isPending,
    updateStatus: updateStatus.mutateAsync,
    updating: updateStatus.isPending,
  };
}

