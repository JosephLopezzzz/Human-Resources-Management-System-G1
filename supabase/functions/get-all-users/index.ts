import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(_req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: string, status: number, req: Request) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "GET") {
    return jsonResponse(JSON.stringify({ error: "Method not allowed" }), 405, req);
  }

  try {
    // Get all users from auth.users
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return jsonResponse(JSON.stringify({ error: "Failed to fetch users" }), 500, req);
    }

    // Get all employees from employees table
    const { data: employeesData, error: employeesError } = await adminClient
      .from("employees")
      .select("*");

    if (employeesError) {
      console.error("Error fetching employees:", employeesError);
      return jsonResponse(JSON.stringify({ error: "Failed to fetch employees" }), 500, req);
    }

    // Combine the data
    const employees = employeesData || [];
    const employeeEmails = new Set(employees.map((emp: any) => emp.email.toLowerCase()));
    
    // Find auth users who don't have employee records
    const authUsersWithoutEmployeeRecords = usersData.users
      .filter((user: any) => !employeeEmails.has(user.email.toLowerCase()))
      .map((user: any) => ({
        id: user.id,
        employee_code: `EMP${user.id.slice(-8).toUpperCase()}`,
        first_name: user.user_metadata?.name?.split(' ')[0] || 'Unknown',
        last_name: user.user_metadata?.name?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        department_id: null,
        position: user.user_metadata?.role || 'employee',
        status: 'regular',
        join_date: user.created_at.split('T')[0],
        salary_amount: 0,
        salary_currency: 'PHP',
      }));

    // Combine both datasets
    const allEmployees = [...employees, ...authUsersWithoutEmployeeRecords];
    
    // Sort by employee_code
    const sortedEmployees = allEmployees.sort((a: any, b: any) => 
      (a.employee_code || '').localeCompare(b.employee_code || '')
    );

    return jsonResponse(JSON.stringify({ employees: sortedEmployees }), 200, req);
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(JSON.stringify({ error: "Internal server error" }), 500, req);
  }
});
