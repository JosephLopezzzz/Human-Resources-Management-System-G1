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

function mapLogToActivity(log: { id: string; action: string; entity_type: string; entity_id: string | null; actor_email: string | null; timestamp: string }) {
  const type = log.action.includes("CREATE") || log.action.includes("APPROVED") ? "approved" as const
    : log.action.includes("REJECT") || log.action.includes("FAIL") ? "rejected" as const
    : "pending" as const;
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
    (r) => r.status === "approved" && new Date(r.end_date) >= new Date() && new Date(r.start_date) <= new Date()
  ).length;
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === "pending").length;
  const probationCount = employees.filter((e) => e.status === "probation").length;
  const totalNetPay = (payrollItems ?? []).reduce((s, i) => s + i.net_pay, 0);
  const attendancePct = employees.length > 0 ? ((presentCount / employees.length) * 100).toFixed(1) : "0";
  const recentActivity = auditLogs.slice(0, 5).map(mapLogToActivity);

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description="Overview of your BLUEPEAK HR operations and workforce insights."
      />

      <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={Users} title="Total Employees" value={employees.length} change={`${departments.length} departments`} changeType="neutral" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={Building2} title="Departments" value={departments.length} change={`${employees.length} employees`} changeType="neutral" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={Clock} title="Present Today" value={presentCount} change={`${attendancePct}% attendance`} changeType="positive" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={CalendarDays} title="On Leave" value={onLeaveCount} change={`${pendingLeaveCount} pending`} changeType="neutral" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard
            icon={DollarSign}
            title="Payroll"
            value={totalNetPay > 0 ? `₱${(totalNetPay / 1e6).toFixed(2)}M` : "—"}
            change={payrollRun?.status === "locked" ? "Locked" : "Current period"}
            changeType="neutral"
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          <StatCard icon={TrendingUp} title="Probation" value={probationCount} change="employees on probation" changeType="neutral" />
        </motion.div>
      </AnimatedList>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
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
                {recentActivity.map((item) => (
                  <motion.tr
                    key={item.id}
                    className="group"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <TableCell className="font-medium text-sm group-hover:bg-muted/30">{item.action}</TableCell>
                    <TableCell className="text-sm group-hover:bg-muted/30">{item.entity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground group-hover:bg-muted/30">{item.actor}</TableCell>
                    <TableCell className="group-hover:bg-muted/30"><StatusBadge status={item.type} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground group-hover:bg-muted/30">{item.time}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Pending Leave Requests</span>
              <span className="font-semibold">{pendingLeaveCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Probation Employees</span>
              <span className="font-semibold">{probationCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Present Today</span>
              <span className="font-semibold">{presentCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Departments</span>
              <span className="font-semibold">{departments.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Payroll Items (Current)</span>
              <span className="font-semibold">{payrollItems?.length ?? 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Recent Audit Logs</span>
              <span className="font-semibold">{auditLogs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
