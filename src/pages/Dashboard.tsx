import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, Building2, Clock, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const recentActivity = [
  { id: 1, action: "Employee Onboarded", entity: "John Smith", actor: "HR Admin", time: "2 min ago", type: "approved" as const },
  { id: 2, action: "Leave Approved", entity: "Sarah Connor", actor: "Manager", time: "15 min ago", type: "approved" as const },
  { id: 3, action: "Payroll Generated", entity: "February 2026", actor: "System", time: "1 hr ago", type: "pending" as const },
  { id: 4, action: "Clock In Late", entity: "Mike Johnson", actor: "System", time: "2 hr ago", type: "rejected" as const },
  { id: 5, action: "KPI Review Submitted", entity: "Emily Davis", actor: "Manager", time: "3 hr ago", type: "pending" as const },
];

const Dashboard = () => {
  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your HR operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Users} title="Total Employees" value={248} change="+12 this month" changeType="positive" />
        <StatCard icon={Building2} title="Departments" value={12} change="2 new" changeType="neutral" />
        <StatCard icon={Clock} title="Present Today" value={231} change="93.1% attendance" changeType="positive" />
        <StatCard icon={CalendarDays} title="On Leave" value={14} change="5.6% of workforce" changeType="neutral" />
        <StatCard icon={DollarSign} title="Payroll (Feb)" value="$1.2M" change="Pending approval" changeType="neutral" />
        <StatCard icon={TrendingUp} title="Avg Rating" value="4.2" change="+0.3 vs last cycle" changeType="positive" />
      </div>

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
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.action}</TableCell>
                    <TableCell className="text-sm">{item.entity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.actor}</TableCell>
                    <TableCell><StatusBadge status={item.type} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.time}</TableCell>
                  </TableRow>
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
              <span className="font-semibold">7</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Probation Employees</span>
              <span className="font-semibold">18</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Upcoming Reviews</span>
              <span className="font-semibold">23</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Open Positions</span>
              <span className="font-semibold">5</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Overtime Hours (Feb)</span>
              <span className="font-semibold">342 hrs</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Failed Login Attempts</span>
              <span className="font-semibold text-destructive">12</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
