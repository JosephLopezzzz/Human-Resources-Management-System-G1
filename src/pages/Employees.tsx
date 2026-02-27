import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Download } from "lucide-react";
import { useState } from "react";

type EmployeeStatus = "regular" | "probation" | "suspended" | "terminated" | "resigned";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: EmployeeStatus;
  joinDate: string;
  salary: string;
}

const employees: Employee[] = [
  { id: "EMP-001", name: "John Smith", email: "john@company.com", department: "Engineering", position: "Sr. Developer", status: "regular", joinDate: "2023-03-15", salary: "$95,000" },
  { id: "EMP-002", name: "Sarah Connor", email: "sarah@company.com", department: "Marketing", position: "Marketing Lead", status: "regular", joinDate: "2022-08-01", salary: "$82,000" },
  { id: "EMP-003", name: "Mike Johnson", email: "mike@company.com", department: "Engineering", position: "Jr. Developer", status: "probation", joinDate: "2026-01-10", salary: "$65,000" },
  { id: "EMP-004", name: "Emily Davis", email: "emily@company.com", department: "HR", position: "HR Specialist", status: "regular", joinDate: "2024-06-20", salary: "$70,000" },
  { id: "EMP-005", name: "Robert Wilson", email: "robert@company.com", department: "Finance", position: "Accountant", status: "regular", joinDate: "2023-11-05", salary: "$75,000" },
  { id: "EMP-006", name: "Lisa Anderson", email: "lisa@company.com", department: "Sales", position: "Sales Rep", status: "suspended", joinDate: "2024-02-14", salary: "$60,000" },
  { id: "EMP-007", name: "David Brown", email: "david@company.com", department: "Engineering", position: "Tech Lead", status: "regular", joinDate: "2021-09-01", salary: "$120,000" },
  { id: "EMP-008", name: "Karen Taylor", email: "karen@company.com", department: "Support", position: "Support Lead", status: "resigned", joinDate: "2022-04-18", salary: "$68,000" },
];

const Employees = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = employees.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records and lifecycle"
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Employee</Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp) => (
                <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {emp.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{emp.id}</TableCell>
                  <TableCell className="text-sm">{emp.department}</TableCell>
                  <TableCell className="text-sm">{emp.position}</TableCell>
                  <TableCell><StatusBadge status={emp.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.joinDate}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{emp.salary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} of {employees.length} employees</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
