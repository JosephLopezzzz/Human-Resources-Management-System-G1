import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { ObfuscatedValue } from "@/components/ObfuscatedValue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { PayrollItem } from "@/hooks/usePayroll";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP" }).format(value);
}

export default function MyPay() {
  const { user } = useAuth();
  const email = user?.email ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["my_payroll_items", email],
    enabled: !!email,
    queryFn: async () => {
      const { data: items, error: err } = await supabase
        .from("payroll_items")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false });
      if (err) throw err;
      const list = (items ?? []) as PayrollItem[];
      if (list.length === 0) return { items: [], runsById: {} as Record<string, { code: string; period_start: string; period_end: string }> };
      const runIds = [...new Set(list.map((i) => i.run_id))];
      const { data: runs } = await supabase
        .from("payroll_runs")
        .select("id, code, period_start, period_end")
        .in("id", runIds);
      const runsById: Record<string, { code: string; period_start: string; period_end: string }> = {};
      (runs ?? []).forEach((r: { id: string; code: string; period_start: string; period_end: string }) => {
        runsById[r.id] = { code: r.code, period_start: r.period_start, period_end: r.period_end };
      });
      return { items: list, runsById };
    },
  });

  const items = data?.items ?? [];
  const runsById = data?.runsById ?? {};

  const grouped = useMemo(() => {
    const byRun = new Map<string, PayrollItem[]>();
    for (const item of items) {
      const arr = byRun.get(item.run_id) ?? [];
      arr.push(item);
      byRun.set(item.run_id, arr);
    }
    return byRun;
  }, [items]);

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Pay" description="Your payslips and payroll history." />
        <Card><CardContent className="py-8 text-center text-muted-foreground">Sign in to view your pay.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Pay" description="Your payslips and payroll history." />

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No payslips yet</CardTitle>
            <CardDescription>Once payroll is processed for your email, your line items will appear here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([runId, runItems]) => {
            const run = runsById[runId];
            return (
              <Card key={runId}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {run ? `${run.code} · ${run.period_start} → ${run.period_end}` : runId}
                  </CardTitle>
                  <CardDescription>Payroll run</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Base</TableHead>
                        <TableHead className="text-right">Allowances</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runItems.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <ObfuscatedValue 
                              auditLabel="My Base Salary" 
                              category="payroll"
                              entityId={row.id}
                              entityType="PAYROLL_ITEM"
                            >
                              {formatCurrency(row.base_salary)}
                            </ObfuscatedValue>
                          </TableCell>
                          <TableCell className="text-right">
                            <ObfuscatedValue 
                              className="justify-end w-full" 
                              auditLabel="My Allowances" 
                              category="payroll"
                              entityId={row.id}
                              entityType="PAYROLL_ITEM"
                            >
                              {formatCurrency(row.allowances)}
                            </ObfuscatedValue>
                          </TableCell>
                          <TableCell className="text-right">
                            <ObfuscatedValue 
                              className="justify-end w-full" 
                              auditLabel="My Deductions" 
                              category="payroll"
                              entityId={row.id}
                              entityType="PAYROLL_ITEM"
                            >
                              {formatCurrency(row.deductions)}
                            </ObfuscatedValue>
                          </TableCell>
                          <TableCell className="text-right">
                            <ObfuscatedValue 
                              className="justify-end w-full" 
                              auditLabel="My Tax" 
                              category="payroll"
                              entityId={row.id}
                              entityType="PAYROLL_ITEM"
                            >
                              {formatCurrency(row.tax)}
                            </ObfuscatedValue>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <ObfuscatedValue 
                              className="justify-end w-full" 
                              auditLabel="My Net Pay" 
                              category="payroll"
                              entityId={row.id}
                              entityType="PAYROLL_ITEM"
                            >
                              {formatCurrency(row.net_pay)}
                            </ObfuscatedValue>
                          </TableCell>
                          <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
