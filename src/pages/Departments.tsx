import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronRight } from "lucide-react";

interface Department {
  id: string;
  name: string;
  manager: string;
  employees: number;
  parent: string | null;
  budget: string;
}

const departments: Department[] = [
  { id: "D-001", name: "Engineering", manager: "David Brown", employees: 45, parent: null, budget: "$2.4M" },
  { id: "D-002", name: "Frontend", manager: "John Smith", employees: 18, parent: "Engineering", budget: "$960K" },
  { id: "D-003", name: "Backend", manager: "Alice Wang", employees: 22, parent: "Engineering", budget: "$1.1M" },
  { id: "D-004", name: "Marketing", manager: "Sarah Connor", employees: 15, parent: null, budget: "$800K" },
  { id: "D-005", name: "HR", manager: "Emily Davis", employees: 8, parent: null, budget: "$450K" },
  { id: "D-006", name: "Finance", manager: "Robert Wilson", employees: 10, parent: null, budget: "$550K" },
  { id: "D-007", name: "Sales", manager: "Tom Harris", employees: 25, parent: null, budget: "$1.3M" },
  { id: "D-008", name: "Support", manager: "Karen Taylor", employees: 12, parent: null, budget: "$600K" },
];

const Departments = () => {
  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational structure and department management"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Department</Button>}
      />

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{dept.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{dept.manager}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dept.parent || "—"}</TableCell>
                  <TableCell className="text-sm text-center">{dept.employees}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{dept.budget}</TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
