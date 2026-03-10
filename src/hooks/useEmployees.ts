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

export function useEmployees() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      console.log("🔍 useEmployees: Fetching from employees table only...");
      
      try {
        // Simple: Just fetch from employees table since admin users will be inserted there
        const { data: employeesData, error: employeesError } = await supabase
          .from("employees")
          .select("*")
          .order("employee_code", { ascending: true });

        if (employeesError) {
          console.error("❌ Employees table error:", employeesError);
          throw employeesError;
        }
        
        console.log("✅ Employees data:", employeesData);
        const parsedEmployees = z.array(employeeSchema).parse(employeesData ?? []);
        console.log("✅ Parsed employees:", parsedEmployees.length);
        
        return parsedEmployees;
        
      } catch (error) {
        console.error("❌ Error in useEmployees:", error);
        throw error;
      }
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

  return {
    ...listQuery,
    employees: listQuery.data ?? [],
    createEmployee: createMutation.mutateAsync,
    creating: createMutation.isPending,
  };
}

