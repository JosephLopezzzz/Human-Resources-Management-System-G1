import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, Building2, Clock, CalendarDays, PhilippinePeso, TrendingUp } from "lucide-react";
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
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
  const attendancePctRaw =
    employees.length > 0 ? (presentCount / employees.length) * 100 : 0;
  const attendancePct = attendancePctRaw.toFixed(1);
  const recentActivity = auditLogs.slice(0, 5).map(mapLogToActivity);

  const totalEmployees = employees.length || 1;
  const donutData = [
    { name: "Present", value: presentCount },
    { name: "On leave", value: onLeaveCount },
    {
      name: "Other",
      value: Math.max(totalEmployees - presentCount - onLeaveCount, 0),
    },
  ];
  const donutColors = ["#22c55e", "#f97316", "#0f172a"];

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description="Overview of your BLUEPEAK HR operations and workforce insights."
        breadcrumb={<span>Home</span>}
      />

      {/* Bento-style summary grid */}
      <AnimatedList className="mb-6 grid auto-rows-[minmax(130px,auto)] gap-5 md:grid-cols-4">
        <motion.div
          className="md:col-span-2 row-span-2"
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Workforce snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
              <div className="relative h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="65%"
                      outerRadius="100%"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="text-xl font-semibold">{attendancePct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {presentCount} of {employees.length || 0} present
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[0] }} />
                    <div>
                      <p className="text-xs text-muted-foreground">Present today</p>
                      <p className="text-sm font-semibold">{presentCount}</p>
                    </div>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[1] }} />
                    <div>
                      <p className="text-xs text-muted-foreground">On leave</p>
                      <p className="text-sm font-semibold">
                        {onLeaveCount}{" "}
                        <span className="text-[11px] text-muted-foreground">({pendingLeaveCount} pending)</span>
                      </p>
                    </div>
                  </div>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[2] }} />
                    <div>
                      <p className="text-xs text-muted-foreground">Total employees</p>
                      <p className="text-sm font-semibold">
                        {employees.length}{" "}
                        <span className="text-[11px] text-muted-foreground">
                          across {departments.length} departments
                        </span>
                      </p>
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary/80" />
                    <div>
                      <p className="text-xs text-muted-foreground">On probation</p>
                      <p className="text-sm font-semibold">{probationCount}</p>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
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
                icon={PhilippinePeso}
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
            <CardTitle className="text-base font-semibold">Quick stats & actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="absolute inset-y-0 right-0 w-32 sm:w-40 opacity-80 pointer-events-none">
                <DotLottieReact
                  src="https://lottie.host/5de1c2dd-1fa3-4aea-84c0-5a25c5ae8cfe/UOAUceFJGW.lottie"
                  loop
                  autoplay
                />
              </div>
              <div className="space-y-2 pr-28 sm:pr-40">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Overview
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Pending leave</p>
                    <p className="text-sm font-semibold">{pendingLeaveCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">On probation</p>
                    <p className="text-sm font-semibold">{probationCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Present today</p>
                    <p className="text-sm font-semibold">{presentCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Departments</p>
                    <p className="text-sm font-semibold">{departments.length}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="/employees"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                View employees
              </a>
              <a
                href="/leave"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Approve leave
              </a>
              <a
                href="/payroll"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors col-span-2"
              >
                Open payroll run
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
