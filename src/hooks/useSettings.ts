import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type Setting = {
  id: string;
  key: string;
  value: any;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*");
      if (error) throw error;
      return (data ?? []) as Setting[];
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { key: string; value: any }) => {
      const { error } = await supabase
        .from("settings")
        .upsert(
          {
            key: payload.key,
            value: payload.value,
          },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: string;
};

export function useUserRoles() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return (data ?? []) as UserRoleRow[];
    },
  });
}

