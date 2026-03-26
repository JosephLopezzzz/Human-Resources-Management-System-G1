import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

const employeeSchema = z.object({
  id: z.string().uuid(),
  employee_code: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  department_id: z.string().uuid().nullable().optional(),
  position: z.string(),
  status: z.enum(["regular", "probation", "suspended", "terminated", "resigned"]),
  join_date: z.string(),
  salary_amount: z.number(),
  salary_currency: z.string(),
});

export type Employee = z.infer<typeof employeeSchema>;
export type EmployeeWithDept = Employee & { department_name: string | null };

export function useEmployees() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .order("employee_code", { ascending: true });

      if (employeesError) throw employeesError;

      const raw = (employeesData ?? []) as Array<{ departments?: { name: string } | null } & Record<string, unknown>>;
      const parsed = z.array(employeeSchema).parse(raw);
      return parsed.map((e, i) => ({
        ...e,
        department_name: raw[i]?.departments?.name ?? null,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      payload: Omit<Employee, "id">
    ) => {
      const { data, error } = await supabase
        .from("employees")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return employeeSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return {
    ...listQuery,
    employees: (listQuery.data ?? []) as EmployeeWithDept[],
    createEmployee: createMutation.mutateAsync,
    creating: createMutation.isPending,
    updateEmployee: updateMutation.mutateAsync,
    updating: updateMutation.isPending,
  };
}

