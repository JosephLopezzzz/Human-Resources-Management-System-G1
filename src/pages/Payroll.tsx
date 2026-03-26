import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ObfuscatedValue } from "@/components/ObfuscatedValue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PhilippinePeso, Lock, FileText, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayroll, usePayrollRuns, usePayrollItemsForRun } from "@/hooks/usePayroll";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canManagePayroll, canApprovePayrollOrViewReports } from "@/auth/roles";
import { format } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const Payroll = () => {
  const { 
    run, runLoading, runError, refetchRun, 
    items, itemsLoading, itemsError, 
    generateRun, generating, 
    submitRun, submitting,
    lockRun, locking,
    deleteRun, deleting 
  } = usePayroll();
  const { data: allRuns = [] } = usePayrollRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: historyItems = [] } = usePayrollItemsForRun(selectedRunId);
  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const canManage = canManagePayroll(role) || canApprovePayrollOrViewReports(role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const totalGross = items.reduce((sum, i) => sum + i.base_salary + i.allowances, 0);
  const totalNet = items.reduce((sum, i) => sum + i.net_pay, 0);
  const pendingCount = items.filter((i) => i.status === "pending").length;

  const filteredItems = items.filter((i) => {
    const term = search.toLowerCase();
    const matchesSearch =
      i.user_email.toLowerCase().includes(term) ||
      i.user_id.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const periodLabel =
    run && run.period_start && run.period_end
      ? `${format(new Date(run.period_start), "MMM d")} - ${format(new Date(run.period_end), "MMM d, yyyy")}`
      : "No run yet";

  async function onGenerate() {
    try {
      await generateRun();
      toast({
        title: "Payroll run ready",
        description: "Current period payroll run has been created.",
      });
    } catch (err) {
      toast({
        title: "Failed to generate payroll",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function onSubmitForReview() {
    try {
      if (!user) return;
      await submitRun(user.id);
      toast({
        title: "Submitted for review",
        description: "Payroll has been sent to Finance for approval.",
      });
    } catch (err) {
      toast({
        title: "Failed to submit",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function onLock() {
    try {
      await lockRun();
      toast({
        title: "Payroll approved & locked",
        description: "The payroll run has been finalized.",
      });
    } catch (err) {
      toast({
        title: "Approval denied",
        description: err instanceof Error ? err.message : "Possible Maker-Checker violation: You cannot approve your own submission.",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Monthly payroll processing and salary management"
        breadcrumb={<span>Home / Payroll</span>}
        actions={
          canManage && (
            <>
              {run?.status === "draft" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSubmitForReview}
                  disabled={submitting || generating || items.length === 0}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${submitting ? "animate-spin" : ""}`} />
                  {submitting ? "Submitting..." : "Submit for Review"}
                </Button>
              )}

              {run?.status === "review_pending" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onLock}
                  disabled={locking || user?.id === run.submitted_by_id}
                  className="bg-success hover:bg-success/90"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  {locking ? "Approving..." : user?.id === run.submitted_by_id ? "Waiting for Checker" : "Approve & Seal"}
                </Button>
              )}

              {run?.status === "locked" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    if (confirm("Are you sure you want to delete this payroll run? All generated items will be lost.")) {
                      await deleteRun();
                      toast({ title: "Run deleted", description: "You can now re-generate the payroll." });
                    }
                  }}
                  disabled={deleting}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Delete & Reset
                </Button>
              )}

              {(!run || run.status === "draft") && (
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={generating || (run && run.status !== "draft")}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {generating ? "Generating..." : "Generate Payroll"}
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={PhilippinePeso}
          title="Total Gross"
          value={
            <ObfuscatedValue 
              auditLabel="Total Gross Payroll (Aggregate)" 
              category="payroll"
              entityId="stats_total_gross"
            >
              {totalGross.toLocaleString(undefined, { style: "currency", currency: "PHP" }).replace(/\$/g, "₱")}
            </ObfuscatedValue>
          }
          change={run ? format(new Date(run.period_start), "MMMM yyyy") : "No run yet"}
          changeType="neutral"
        />
        <StatCard
          icon={PhilippinePeso}
          title="Total Net"
          value={
            <ObfuscatedValue 
              auditLabel="Total Net Payroll (Aggregate)" 
              category="payroll"
              entityId="stats_total_net"
            >
              {totalNet.toLocaleString(undefined, { style: "currency", currency: "PHP" }).replace(/\$/g, "₱")}
            </ObfuscatedValue>
          }
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
          value={run?.status === "locked" ? "Locked" : run?.status === "review_pending" ? "Pending" : "Draft"}
          change={run?.status === "locked" ? "Payroll finalized" : run?.status === "review_pending" ? "Awaiting approval" : "Ready for review"}
          changeType={run?.status === "review_pending" ? "negative" : "neutral"}
        />
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList className="mb-4">
          <TabsTrigger value="breakdown">Salary Breakdown</TabsTrigger>
          <TabsTrigger value="history">
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
              {runError && !String(runError?.message || runError).includes("data is undefined") && (
                <div className="flex flex-col gap-3 mb-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-sm text-destructive font-medium">
                    Failed to load current run.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add SELECT policies for <code className="font-mono bg-muted px-1 rounded">payroll_runs</code> and{" "}
                    <code className="font-mono bg-muted px-1 rounded">payroll_items</code> in Supabase. See{" "}
                    <code className="font-mono bg-muted px-1 rounded">SUPABASE_PAYROLL_SETUP.md</code> for the SQL.
                    If you already ran the SQL, log out and log back in, then retry. Ensure your app&apos;s <code className="font-mono bg-muted px-1 rounded">.env</code> uses the same Supabase project.
                  </p>
                  {"message" in runError && (
                    <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all" title={String(runError)}>
                      {String((runError as { message?: string }).message)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchRun?.()}
                    disabled={runLoading}
                    className="w-fit"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {runLoading ? "Retrying..." : "Retry"}
                  </Button>
                </div>
              )}
              {runError && String(runError?.message || runError).includes("data is undefined") && !run && !runLoading && (
                <div className="flex flex-col gap-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    {canManage
                      ? "No payroll run for this period yet. Create one using the button below or in the page header."
                      : "No payroll run for this period yet. Ask an admin or HR to generate payroll."}
                  </p>
                  {canManage && (
                    <Button size="sm" onClick={onGenerate} disabled={generating} className="w-fit">
                      <FileText className="h-4 w-4 mr-1" />
                      {generating ? "Generating..." : "Generate Payroll"}
                    </Button>
                  )}
                </div>
              )}
              {itemsError && (
                <div className="text-sm text-destructive mb-2">
                  Failed to load payroll items.
                </div>
              )}

              <div className="flex gap-3 mb-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee or ID..."
                    className="pl-8 h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as "all" | "pending" | "approved" | "rejected")
                  }
                >
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
              {itemsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No payroll items for this run.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{pr.employee_name || pr.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {pr.department_name ? `${pr.department_name} • ` : ""}<span className="font-mono">{pr.user_id.slice(0, 8)}</span>
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      <ObfuscatedValue 
                        className="justify-end w-full"
                        auditLabel={`Base Salary for ${pr.user_email}`}
                        category="payroll"
                        entityId={pr.id}
                        entityType="PAYROLL_ITEM"
                      >
                        {pr.base_salary
                          .toLocaleString(undefined, { style: "currency", currency: "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-success">
                      <ObfuscatedValue 
                        className="justify-end w-full"
                        auditLabel={`Allowances for ${pr.user_email}`}
                        category="payroll"
                        entityId={pr.id}
                        entityType="PAYROLL_ITEM"
                      >
                        {pr.allowances
                          .toLocaleString(undefined, { style: "currency", currency: "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-destructive">
                      <ObfuscatedValue 
                        className="justify-end w-full"
                        auditLabel={`Deductions for ${pr.user_email}`}
                        category="payroll"
                        entityId={pr.id}
                        entityType="PAYROLL_ITEM"
                      >
                        {pr.deductions
                          .toLocaleString(undefined, { style: "currency", currency: "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-destructive">
                      <ObfuscatedValue 
                        className="justify-end w-full"
                        auditLabel={`Tax for ${pr.user_email}`}
                        category="payroll"
                        entityId={pr.id}
                        entityType="PAYROLL_ITEM"
                      >
                        {pr.tax
                          .toLocaleString(undefined, { style: "currency", currency: "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold">
                      <ObfuscatedValue 
                        className="justify-end w-full"
                        auditLabel={`Net Pay for ${pr.user_email}`}
                        category="payroll"
                        entityId={pr.id}
                        entityType="PAYROLL_ITEM"
                      >
                        {pr.net_pay
                          .toLocaleString(undefined, { style: "currency", currency: "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pr.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Past Payroll Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedRunId ?? ""} onValueChange={(v) => setSelectedRunId(v || null)}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Select a run to view details" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRuns.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} — {format(new Date(r.period_start), "MMM d")} to {format(new Date(r.period_end), "MMM d, yyyy")} ({r.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!selectedRunId ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Select a payroll run to view details.</p>
              ) : historyItems.length === 0 ? (
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        No payroll items for this run.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((pr) => (
                      <TableRow key={pr.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{pr.employee_name || pr.user_email}</p>
                          {pr.department_name && <p className="text-xs text-muted-foreground">{pr.department_name}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono">
                          <ObfuscatedValue className="justify-end w-full">
                            {pr.base_salary.toLocaleString(undefined, { style: "currency", currency: "PHP" }).replace(/\$/g, "₱")}
                          </ObfuscatedValue>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono font-semibold">
                          <ObfuscatedValue className="justify-end w-full">
                            {pr.net_pay.toLocaleString(undefined, { style: "currency", currency: "PHP" }).replace(/\$/g, "₱")}
                          </ObfuscatedValue>
                        </TableCell>
                        <TableCell><StatusBadge status={pr.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payroll;
