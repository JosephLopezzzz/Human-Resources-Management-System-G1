import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Lock, FileText, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayroll } from "@/hooks/usePayroll";
import { useAuth } from "@/auth/useAuth";
import { format } from "date-fns";

const Payroll = () => {
  const { run, runLoading, runError, items, itemsLoading, itemsError, generateRun, generating, lockRun, locking } =
    usePayroll();
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const canManage = ["admin", "hr", "payroll"].includes(role);

  const totalGross = items.reduce((sum, i) => sum + i.base_salary + i.allowances, 0);
  const totalNet = items.reduce((sum, i) => sum + i.net_pay, 0);
  const pendingCount = items.filter((i) => i.status === "pending").length;

  const periodLabel =
    run && run.period_start && run.period_end
      ? `${format(new Date(run.period_start), "MMM d")} - ${format(new Date(run.period_end), "MMM d, yyyy")}`
      : "No run yet";

  async function onGenerate() {
    await generateRun();
  }

  async function onLock() {
    await lockRun();
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Monthly payroll processing and salary management"
        actions={
          canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onLock}
                disabled={!run || run.status === "locked" || locking}
              >
                <Lock className="h-4 w-4 mr-1" />
                {locking ? "Locking..." : run?.status === "locked" ? "Locked" : "Lock Payroll"}
              </Button>
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={generating}
              >
                <FileText className="h-4 w-4 mr-1" />
                {generating ? "Generating..." : "Generate Payroll"}
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          title="Total Gross"
          value={totalGross.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          change={periodLabel}
          changeType="neutral"
        />
        <StatCard
          icon={DollarSign}
          title="Total Net"
          value={totalNet.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          change="After deductions"
          changeType="neutral"
        />
        <StatCard
          icon={AlertTriangle}
          title="Pending"
          value={pendingCount}
          change="Needs approval"
          changeType={pendingCount > 0 ? "negative" : "neutral"}
        />
        <StatCard
          icon={Lock}
          title="Status"
          value={run ? run.status.toUpperCase() : "NO RUN"}
          change={run ? run.code : ""}
          changeType={run?.status === "locked" ? "neutral" : "negative"}
        />
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList className="mb-4">
          <TabsTrigger value="breakdown">Salary Breakdown</TabsTrigger>
          <TabsTrigger value="history" disabled>
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {run ? `${run.code} (${periodLabel})` : "No payroll run generated yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runLoading && (
                <div className="text-sm text-muted-foreground mb-4">
                  Loading current run...
                </div>
              )}
              {runError && (
                <div className="text-sm text-destructive mb-4">
                  Failed to load current run.
                </div>
              )}
              {itemsLoading && (
                <div className="text-sm text-muted-foreground mb-2">
                  Loading items...
                </div>
              )}
              {itemsError && (
                <div className="text-sm text-destructive mb-2">
                  Failed to load payroll items.
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{pr.user_email}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {pr.user_id.slice(0, 8)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {pr.base_salary.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono text-success">
                        {pr.allowances.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono text-destructive">
                        {pr.deductions.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono text-destructive">
                        {pr.tax.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold">
                        {pr.net_pay.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={pr.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground text-sm py-12">
              Payroll history will be available once connected to a history query.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payroll;
