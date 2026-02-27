import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

const attendanceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_email: z.string().email(),
  day: z.string(),
  clock_in_at: z.string(),
  clock_out_at: z.string().nullable(),
});

export type AttendanceLog = z.infer<typeof attendanceSchema>;

export function useTodayAttendance() {
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const listQuery = useQuery({
    queryKey: ["attendance", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("day", today)
        .order("clock_in_at", { ascending: true });

      if (error) throw error;
      return z.array(attendanceSchema).parse(data ?? []);
    },
  });

  const clockMutation = useMutation({
    mutationFn: async (opts: { userId: string; email: string }) => {
      // First, check if there's an open log for this user today.
      const { data: openRows, error: fetchError } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("user_id", opts.userId)
        .eq("day", today)
        .is("clock_out_at", null)
        .limit(1);

      if (fetchError) throw fetchError;

      const now = new Date().toISOString();

      if (!openRows || openRows.length === 0) {
        const { error: insertError } = await supabase.from("attendance_logs").insert({
          user_id: opts.userId,
          user_email: opts.email,
          day: today,
          clock_in_at: now,
        });
        if (insertError) throw insertError;
        return "clocked_in" as const;
      }

      const row = openRows[0];
      const { error: updateError } = await supabase
        .from("attendance_logs")
        .update({ clock_out_at: now })
        .eq("id", row.id);

      if (updateError) throw updateError;
      return "clocked_out" as const;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", today] });
    },
  });

  return {
    ...listQuery,
    logs: listQuery.data ?? [],
    clockInOut: clockMutation.mutateAsync,
    clocking: clockMutation.isPending,
  };
}

