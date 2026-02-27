import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { Clock, UserCheck, AlertTriangle, Timer } from "lucide-react";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/auth/useAuth";
import { format } from "date-fns";

const Attendance = () => {
  const { logs, isLoading, error, clockInOut, clocking } = useTodayAttendance();
  const { user } = useAuth();

  const openLog = user
    ? logs.find((l) => l.user_id === user.id && l.clock_out_at === null)
    : undefined;

  const buttonLabel = !user
    ? "Sign in to track time"
    : openLog
    ? "Clock Out"
    : "Clock In";

  async function handleClock() {
    if (!user) return;
    await clockInOut({ userId: user.id, email: user.email ?? "" });
  }

  const todayLabel = format(new Date(), "MMM d, yyyy");

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking and overtime management"
        actions={
          <Button
            size="sm"
            onClick={handleClock}
            disabled={!user || clocking}
          >
            <Clock className="h-4 w-4 mr-1" />
            {clocking ? "Saving..." : buttonLabel}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={UserCheck}
          title="Present"
          value={logs.filter((l) => l.clock_in_at).length}
          change="Today"
          changeType="neutral"
        />
        <StatCard
          icon={Clock}
          title="Open Sessions"
          value={logs.filter((l) => !l.clock_out_at).length}
          change="Currently clocked in"
          changeType="neutral"
        />
        <StatCard
          icon={AlertTriangle}
          title="Completed"
          value={logs.filter((l) => l.clock_out_at).length}
          change="Clocked in & out"
          changeType="neutral"
        />
        <StatCard
          icon={Timer}
          title="Entries"
          value={logs.length}
          change="Total records today"
          changeType="neutral"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Log — {todayLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-sm text-muted-foreground mb-4">
              Loading attendance...
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive mb-4">
              Failed to load attendance.
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((row) => {
                const clockIn = format(new Date(row.clock_in_at), "HH:mm");
                const clockOut = row.clock_out_at
                  ? format(new Date(row.clock_out_at), "HH:mm")
                  : "—";
                const status =
                  row.clock_out_at === null ? ("pending" as const) : ("active" as const);

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{row.user_email}</p>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{clockIn}</TableCell>
                    <TableCell className="text-sm font-mono">{clockOut}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={status}
                        label={status === "active" ? "Completed" : "In Progress"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
