import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, Building2, Clock, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTransition, AnimatedList } from "@/components/motion";
import { motion } from "framer-motion";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useLeaveRequests } from "@/hooks/useLeave";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { usePayroll } from "@/hooks/usePayroll";
import { formatDistanceToNow } from "date-fns";

function mapLogToActivity(log: {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_email: string | null;
  timestamp: string;
}) {
  const type =
    log.action.includes("CREATE") || log.action.includes("APPROVED")
      ? ("approved" as const)
      : log.action.includes("REJECT") || log.action.includes("FAIL")
        ? ("rejected" as const)
        : ("pending" as const);

  return {
    id: log.id,
    action: log.action.replace(/_/g, " "),
    entity: log.entity_type + (log.entity_id ? ` #${String(log.entity_id).slice(0, 8)}` : ""),
    actor: log.actor_email ?? "system",
    time: formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }),
    type,
  };
}

const Dashboard = () => {
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const { logs: attendanceLogs } = useTodayAttendance();
  const { data: leaveRequests = [] } = useLeaveRequests();
  const { data: auditLogs = [] } = useAuditLogs("", "all");
  const { run: payrollRun, items: payrollItems } = usePayroll();

  const presentCount = attendanceLogs.filter((l) => l.clock_in_at).length;
  const onLeaveCount = leaveRequests.filter(
    (r) =>
      r.status === "approved" &&
      new Date(r.end_date) >= new Date() &&
      new Date(r.start_date) <= new Date()
  ).length;
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === "pending").length;
  const probationCount = employees.filter((e) => e.status === "probation").length;
  const totalNetPay = (payrollItems ?? []).reduce((s, i) => s + i.net_pay, 0);
  const attendancePct =
    employees.length > 0 ? ((presentCount / employees.length) * 100).toFixed(1) : "0";
  const recentActivity = auditLogs.slice(0, 5).map(mapLogToActivity);

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description="Overview of your BLUEPEAK HR operations and workforce insights."
      />

      {/* Bento-style summary grid */}
      <AnimatedList className="mb-6 grid auto-rows-[minmax(130px,auto)] gap-4 md:grid-cols-4">
        <motion.div
          className="md:col-span-2 row-span-2"
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Workforce snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <StatCard
                icon={Users}
                title="Total employees"
                value={employees.length}
                change={`${departments.length} departments`}
                changeType="neutral"
              />
              <StatCard
                icon={Clock}
                title="Present today"
                value={presentCount}
                change={`${attendancePct}% attendance`}
                changeType="positive"
              />
              <StatCard
                icon={CalendarDays}
                title="On leave"
                value={onLeaveCount}
                change={`${pendingLeaveCount} pending`}
                changeType="neutral"
              />
              <StatCard
                icon={TrendingUp}
                title="On probation"
                value={probationCount}
                change="employees on probation"
                changeType="neutral"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="md:col-span-2"
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Payroll overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <StatCard
                icon={DollarSign}
                title="Net payroll (current)"
                value={totalNetPay > 0 ? `₱${(totalNetPay / 1_000_000).toFixed(2)}M` : "—"}
                change={payrollRun?.status === "locked" ? "Locked" : "Current period"}
                changeType="neutral"
              />
              <StatCard
                icon={Building2}
                title="Payroll items"
                value={payrollItems?.length ?? 0}
                change="line items in current run"
                changeType="neutral"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <StatCard
            icon={Users}
            title="Departments"
            value={departments.length}
            change={`${employees.length} employees`}
            changeType="neutral"
          />
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <StatCard
            icon={Clock}
            title="Attendance entries today"
            value={attendanceLogs.length}
            change="check-ins recorded"
            changeType="neutral"
          />
        </motion.div>
      </AnimatedList>

      {/* Bottom bento row: activity + quick stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item) => (
                    <motion.tr
                      key={item.id}
                      className="group"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <TableCell className="font-medium text-sm group-hover:bg-muted/30">
                        {item.action}
                      </TableCell>
                      <TableCell className="text-sm group-hover:bg-muted/30">
                        {item.entity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground group-hover:bg-muted/30">
                        {item.actor}
                      </TableCell>
                      <TableCell className="group-hover:bg-muted/30">
                        <StatusBadge status={item.type} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground group-hover:bg-muted/30">
                        {item.time}
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Pending leave requests</span>
              <span className="text-sm font-semibold">{pendingLeaveCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Employees on probation</span>
              <span className="text-sm font-semibold">{probationCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Present today</span>
              <span className="text-sm font-semibold">{presentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Departments</span>
              <span className="text-sm font-semibold">{departments.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Payroll items (current)</span>
              <span className="text-sm font-semibold">{payrollItems?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Audit log entries</span>
              <span className="text-sm font-semibold">{auditLogs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
