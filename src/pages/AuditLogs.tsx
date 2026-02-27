import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  category: string;
}

const auditLogs: AuditLog[] = [
  { id: "AL-001", timestamp: "2026-02-27 14:23:01", actor: "admin@hrms.io", action: "LOGIN_SUCCESS", entity: "Auth", entityId: "—", ipAddress: "192.168.1.100", category: "auth" },
  { id: "AL-002", timestamp: "2026-02-27 14:15:33", actor: "hr@hrms.io", action: "EMPLOYEE_UPDATED", entity: "Employee", entityId: "EMP-003", ipAddress: "192.168.1.101", category: "employee" },
  { id: "AL-003", timestamp: "2026-02-27 13:50:12", actor: "admin@hrms.io", action: "PAYROLL_GENERATED", entity: "Payroll", entityId: "PAY-FEB-2026", ipAddress: "192.168.1.100", category: "payroll" },
  { id: "AL-004", timestamp: "2026-02-27 13:22:45", actor: "manager@hrms.io", action: "LEAVE_APPROVED", entity: "Leave", entityId: "LR-102", ipAddress: "192.168.1.105", category: "leave" },
  { id: "AL-005", timestamp: "2026-02-27 12:10:09", actor: "admin@hrms.io", action: "ROLE_CHANGED", entity: "User", entityId: "USR-012", ipAddress: "192.168.1.100", category: "auth" },
  { id: "AL-006", timestamp: "2026-02-27 11:45:30", actor: "system", action: "LOGIN_FAILED", entity: "Auth", entityId: "—", ipAddress: "10.0.0.55", category: "auth" },
  { id: "AL-007", timestamp: "2026-02-27 11:30:00", actor: "hr@hrms.io", action: "EMPLOYEE_CREATED", entity: "Employee", entityId: "EMP-009", ipAddress: "192.168.1.101", category: "employee" },
  { id: "AL-008", timestamp: "2026-02-27 10:20:15", actor: "admin@hrms.io", action: "PAYROLL_LOCKED", entity: "Payroll", entityId: "PAY-JAN-2026", ipAddress: "192.168.1.100", category: "payroll" },
];

const categoryColors: Record<string, string> = {
  auth: "bg-info/10 text-info border-info/20",
  employee: "bg-primary/10 text-primary border-primary/20",
  payroll: "bg-success/10 text-success border-success/20",
  leave: "bg-warning/10 text-warning border-warning/20",
};

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = auditLogs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) || log.actor.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "all" || log.category === category;
    return matchesSearch && matchesCat;
  });

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
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                  <TableCell className="text-sm">{log.actor}</TableCell>
                  <TableCell className="text-sm font-mono font-medium">{log.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={categoryColors[log.category]}>{log.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{log.entityId}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{log.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {auditLogs.length} logs</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
