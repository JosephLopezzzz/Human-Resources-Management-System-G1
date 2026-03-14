import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { Clock, UserCheck, AlertTriangle, Timer, Coffee, Download } from "lucide-react";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/auth/useAuth";
import { format, intervalToDuration, formatDuration } from "date-fns";
import { useState, useEffect } from "react";
import { getCanonicalRole } from "@/auth/roles";

const Attendance = () => {
  const { logs, isLoading, error, clockInOut, clocking, startLunch, endLunch, lunching } = useTodayAttendance();
  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const isAttendanceAdmin = role === "system_admin";

  const visibleLogs = isAttendanceAdmin || !user ? logs : logs.filter((l) => l.user_id === user.id);

  const openLog = user
    ? logs.find((l) => l.user_id === user.id && l.clock_out_at === null)
    : undefined;

  const buttonLabel = !user
    ? "Sign in to track time"
    : openLog
    ? "Clock Out"
    : "Clock In";

  const isOnLunch = openLog && openLog.lunch_start_time && !openLog.lunch_end_time;

  async function handleClock() {
    if (!user) return;
    await clockInOut({ userId: user.id, email: user.email ?? "" });
  }

  async function handleLunch() {
    if (!openLog) return;
    const action = isOnLunch ? "end" : "start";
    await (action === "start" ? startLunch({ logId: openLog.id, action: "start" }) : endLunch({ logId: openLog.id, action: "end" }));
  }

  const todayLabel = format(new Date(), "MMM d, yyyy");

  const [totalAccumulatedMs, setTotalAccumulatedMs] = useState(0);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = new Date();
      let totalMs = 0;

      const userLogs = logs.filter((l) => l.user_id === user.id);

      userLogs.forEach((log) => {
        const clockIn = new Date(log.clock_in_at);
        const clockOut = log.clock_out_at ? new Date(log.clock_out_at) : now;

        let sessionMs = clockOut.getTime() - clockIn.getTime();

        if (log.lunch_start_time) {
          const lunchStart = new Date(log.lunch_start_time);
          const lunchEnd = log.lunch_end_time ? new Date(log.lunch_end_time) : now;
          const lunchMs = lunchEnd.getTime() - lunchStart.getTime();
          sessionMs -= lunchMs;
        }

        totalMs += Math.max(0, sessionMs);
      });

      setTotalAccumulatedMs(totalMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [logs, user]);

  const formatMs = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const accumulatedTimeDisplay = formatMs(totalAccumulatedMs);

  function exportCsv() {
    const rows = visibleLogs.map((row) => ({
      user: row.user_email,
      clockIn: row.clock_in_at,
      lunchStart: row.lunch_start_time ?? "",
      lunchEnd: row.lunch_end_time ?? "",
      clockOut: row.clock_out_at ?? "",
    }));
    const header = ["User", "Clock In", "Lunch Start", "Lunch End", "Clock Out"];
    const csv =
      [header.join(","), ...rows.map((r) => [r.user, r.clockIn, r.lunchStart, r.lunchEnd, r.clockOut].join(","))].join(
        "\n"
      );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${todayLabel.replace(/[, ]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking and overtime management"
        breadcrumb={<span>Home / Attendance</span>}
        actions={
          <>
            {isAttendanceAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="mr-2"
                disabled={visibleLogs.length === 0}
                onClick={exportCsv}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            <Button size="sm" onClick={handleClock} disabled={!user || clocking || isOnLunch}>
              <Clock className="h-4 w-4 mr-1" />
              {clocking ? "Saving..." : buttonLabel}
            </Button>

            {openLog && !openLog.clock_out_at && (
              <Button size="sm" variant="outline" onClick={handleLunch} disabled={lunching}>
                <Coffee className="h-4 w-4 mr-1" />
                {lunching ? "Saving..." : isOnLunch ? "End Lunch" : "Start Lunch"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={UserCheck}
          title="Present"
          value={visibleLogs.filter((l) => l.clock_in_at).length}
          change="Today"
          changeType="neutral"
        />
        <StatCard
          icon={Clock}
          title="Open Sessions"
          value={visibleLogs.filter((l) => !l.clock_out_at).length}
          change="Currently clocked in"
          changeType="neutral"
        />
        <StatCard
          icon={AlertTriangle}
          title="Completed"
          value={visibleLogs.filter((l) => l.clock_out_at).length}
          change="Clocked in & out"
          changeType="neutral"
        />
        <StatCard
          icon={Timer}
          title="Entries"
          value={visibleLogs.length}
          change="Total records today"
          changeType="neutral"
        />
        <StatCard
          icon={Timer}
          title="Accumulated Time"
          value={accumulatedTimeDisplay}
          change="Today"
          changeType="positive"
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
                <TableHead>Lunch Start</TableHead>
                <TableHead>Lunch End</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLogs.map((row) => {
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{row.user_email}</p>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {format(new Date(row.clock_in_at), "HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {row.lunch_start_time ? format(new Date(row.lunch_start_time), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {row.lunch_end_time ? format(new Date(row.lunch_end_time), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {row.clock_out_at ? format(new Date(row.clock_out_at), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {row.clock_out_at
                        ? formatDuration(
                            intervalToDuration({
                              start: new Date(row.clock_in_at),
                              end: new Date(row.clock_out_at),
                            }),
                            { format: ["hours", "minutes"] }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          row.lunch_start_time && !row.lunch_end_time
                            ? "warning"
                            : row.clock_out_at
                            ? "success"
                            : "info"
                        }
                        label={
                          row.lunch_start_time && !row.lunch_end_time
                            ? "On Lunch"
                            : row.clock_out_at
                            ? "Completed"
                            : "Clocked In"
                        }
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
