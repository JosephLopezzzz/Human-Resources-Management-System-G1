import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { Clock, UserCheck, AlertTriangle, Timer } from "lucide-react";

const attendanceToday = [
  { id: "EMP-001", name: "John Smith", clockIn: "08:55", clockOut: "17:30", hours: "8.58", status: "active" as const, overtime: "0.58" },
  { id: "EMP-002", name: "Sarah Connor", clockIn: "09:15", clockOut: "—", hours: "—", status: "pending" as const, overtime: "—" },
  { id: "EMP-003", name: "Mike Johnson", clockIn: "09:35", clockOut: "—", hours: "—", status: "rejected" as const, overtime: "—" },
  { id: "EMP-004", name: "Emily Davis", clockIn: "08:50", clockOut: "17:00", hours: "8.17", status: "active" as const, overtime: "0.17" },
  { id: "EMP-005", name: "Robert Wilson", clockIn: "08:58", clockOut: "18:15", hours: "9.28", status: "active" as const, overtime: "1.28" },
  { id: "EMP-007", name: "David Brown", clockIn: "08:30", clockOut: "19:00", hours: "10.5", status: "active" as const, overtime: "2.5" },
];

const Attendance = () => {
  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking and overtime management"
        actions={<Button size="sm"><Clock className="h-4 w-4 mr-1" />Clock In/Out</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={UserCheck} title="Present" value={231} change="93.1% of workforce" changeType="positive" />
        <StatCard icon={Clock} title="Late Arrivals" value={14} change="5.6% today" changeType="negative" />
        <StatCard icon={AlertTriangle} title="Absent" value={3} change="Unexcused" changeType="negative" />
        <StatCard icon={Timer} title="Overtime Today" value="42 hrs" change="18 employees" changeType="neutral" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Log — Feb 27, 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceToday.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.id}</p>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{row.clockIn}</TableCell>
                  <TableCell className="text-sm font-mono">{row.clockOut}</TableCell>
                  <TableCell className="text-sm font-mono">{row.hours}</TableCell>
                  <TableCell className="text-sm font-mono">{row.overtime}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={row.status}
                      label={row.status === "active" ? "On Time" : row.status === "pending" ? "In Progress" : "Late"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
