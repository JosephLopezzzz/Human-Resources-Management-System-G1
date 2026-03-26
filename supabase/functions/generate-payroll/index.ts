import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(`Missing Env Vars: URL=${!!supabaseUrl}, KEY=${!!supabaseServiceRoleKey}`);
    }
    
    // Use the Service Role Key to bypass RLS and ensure payroll can calculate
    // securely on the server without encountering missing client-side policies.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      throw new Error("Missing 'runId' in request body.");
    }

    // 1. Fetch the requested Payroll Run to ensure it exists and is draft
    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) throw new Error("Payroll run not found.");
    if (run.status !== "draft") {
      throw new Error("Cannot generate items for a non-draft payroll run.");
    }

    // 2. Clear existing items for this run safely
    const { error: delError } = await supabase
      .from("payroll_items")
      .delete()
      .eq("run_id", runId)
      .eq("status", "pending")
      .neq("status", "approved");
      
    if (delError) {
      console.warn("Could not delete existing items, might be empty:", delError);
    }

    // 3. Fetch Employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, email, first_name, last_name, position, salary_amount, allowances, deductions, departments(name)")
      .in("status", ["regular", "probation"]);
      
    if (empError) throw empError;

    const empIds = (employees || []).map((e: any) => e.id);

    // Fetch all unpaid leaves
    const { data: allUnpaidLeaves } = await supabase
      .from("leave_requests")
      .select("user_id, days, leave_types!inner(is_unpaid)")
      .eq("status", "approved")
      .eq("leave_types.is_unpaid", true)
      .in("user_id", empIds)
      .gte("start_date", run.period_start)
      .lte("end_date", run.period_end);

    // Fetch all attendance logs
    const { data: allAttendanceLogs } = await supabase
      .from("attendance_logs")
      .select("user_id, day, clock_in_at")
      .in("user_id", empIds)
      .gte("day", run.period_start)
      .lte("day", run.period_end);

    // Fetch all performance scores
    const { data: allPerformances } = await supabase
      .from("performance_participants")
      .select("user_id, score")
      .eq("status", "approved")
      .in("user_id", empIds)
      .gte("evaluated_at", run.period_start)
      .lte("evaluated_at", run.period_end);

    const itemsToInsert = [];
    const workdaysInPeriod = 10;

    for (const emp of (employees || [])) {
      const base = Number(emp.salary_amount) || 0;
      const allowances = Number(emp.allowances) || 0;
      const fixedDeductions = Number(emp.deductions) || 0;

      // --- Filter Leaves for this employee ---
      const unpaidLeaves = (allUnpaidLeaves || []).filter((l: any) => l.user_id === emp.id);
      const unpaidDays = unpaidLeaves.reduce((sum: number, l: any) => sum + (l.days || 0), 0);
      const dailyRate = base / 22;
      const leaveDeduction = unpaidDays * dailyRate;

      // --- Filter Attendance for this employee ---
      const logs = (allAttendanceLogs || []).filter((l: any) => l.user_id === emp.id);
      let tardinessDeduction = 0;
      
      const minuteRate = dailyRate / 8 / 60;
      logs.forEach((log: any) => {
        const clockInTime = new Date(log.clock_in_at);
        const hour = clockInTime.getHours();
        const minute = clockInTime.getMinutes();
        if (hour > 9 || (hour === 9 && minute > 0)) {
          const lateMinutes = (hour - 9) * 60 + minute;
          tardinessDeduction += lateMinutes * minuteRate;
        }
      });

      const loggedDays = new Set(logs.map((l: any) => l.day)).size;
      const missingDays = Math.max(0, workdaysInPeriod - loggedDays - unpaidDays);
      const absenceDeduction = missingDays * dailyRate;

      // --- Filter Performance for this employee ---
      const performance = (allPerformances || []).find((p: any) => p.user_id === emp.id);
      let performanceBonus = 0;
      if (performance && performance.score >= 90) {
        performanceBonus = 5000;
      }

      const totalAllowances = allowances + performanceBonus;
      const totalDeductions = fixedDeductions + leaveDeduction + tardinessDeduction + absenceDeduction;
      
      const taxableIncome = base + totalAllowances - totalDeductions;
      let tax = 0;
      if (taxableIncome > 20833) {
        tax = (taxableIncome - 20833) * 0.20;
      }

      const netPay = base + totalAllowances - totalDeductions - tax;

      // @ts-ignore - Departments has varying shapes depending on the query
      const deptName = emp.departments?.name || emp.departments?.[0]?.name || "General";

      itemsToInsert.push({
        run_id: run.id,
        user_id: emp.id,
        user_email: emp.email || "",
        employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email || "",
        department_name: deptName,
        job_title: emp.position || "",
        base_salary: base,
        allowances: totalAllowances,
        deductions: totalDeductions,
        tax,
        net_pay: netPay,
        status: "pending",
      });
    }

    if (itemsToInsert.length > 0) {
      // Chunk inserts if too large, but 1000 items is ~1MB, should be fine for a single insert.
      // Doing it in chunks of 500 to be safe.
      for (let i = 0; i < itemsToInsert.length; i += 500) {
        const chunk = itemsToInsert.slice(i, i + 500);
        const { error: insertError } = await supabase
          .from("payroll_items")
          .insert(chunk);
        if (insertError) throw insertError;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Generated ${itemsToInsert.length} payroll items.`,
      count: itemsToInsert.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: unknown) {
    let msg = "Unknown edge error";
    if (err instanceof Error) {
      msg = err.message;
    } else if (typeof err === "object" && err !== null) {
      msg = (err as any).message || (err as any).details || String(err);
    } else {
      msg = String(err);
    }

    return new Response(JSON.stringify({ apiError: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
