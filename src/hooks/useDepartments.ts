import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

const departmentSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  manager_user_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  budget_amount: z.number().nullable(),
  budget_currency: z.string(),
});

export type Department = z.infer<typeof departmentSchema>;

export function useDepartments() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("code", { ascending: true });

      if (error) throw error;
      return z.array(departmentSchema).parse(data ?? []);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      payload: Omit<Department, "id">
    ) => {
      const { data, error } = await supabase
        .from("departments")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return departmentSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  return {
    ...listQuery,
    departments: listQuery.data ?? [],
    createDepartment: createMutation.mutateAsync,
    creating: createMutation.isPending,
  };
}

