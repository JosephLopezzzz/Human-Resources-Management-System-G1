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
  auth: "bg-info/10 text-info border-info/20",
  employee: "bg-primary/10 text-primary border-primary/20",
  payroll: "bg-success/10 text-success border-success/20",
  leave: "bg-warning/10 text-warning border-warning/20",
};

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: logs = [], isLoading, error } = useAuditLogs(search, category);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="System-wide activity tracking and compliance audit trail"
        actions={<Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by action or actor..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
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
                <TableHead>Category</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                  </TableCell>
                  <TableCell className="text-sm">{log.actor_email ?? "system"}</TableCell>
                  <TableCell className="text-sm font-mono font-medium">{log.action}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={categoryColors[log.category] ?? ""}
                    >
                      {log.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity_type}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.entity_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.ip_address ?? "—"}
                  </TableCell>
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
