import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";

const categoryColors: Record<string, string> = {
  auth: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
  employee: "bg-primary/10 text-primary border-primary/20",
  payroll: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  leave: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
};

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: logs = [], isLoading, error } = useAuditLogs(search, category);

  function handleExport() {
    const headers = ["Timestamp", "Actor", "Action", "Category", "Entity Type", "Entity ID"];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.actor_email ?? "system",
      log.action,
      log.category,
      log.entity_type,
      log.entity_id ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="System-wide activity tracking and compliance audit trail"
        actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by action or actor..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground mb-4">
              Loading audit logs...
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive mb-4">
              Failed to load audit logs.
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                  </TableCell>
                  <TableCell className="text-sm">{log.actor_email ?? "system"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{log.action}</span>
                      <Badge
                        variant="outline"
                        className={categoryColors[log.category] ?? ""}
                      >
                        {log.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {logs.length} log(s)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
