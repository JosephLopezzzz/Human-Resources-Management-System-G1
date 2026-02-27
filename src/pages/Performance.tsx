import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";

interface ReviewCycle {
  id: string;
  name: string;
  period: string;
  status: "active" | "pending" | "approved";
  completion: number;
  participants: number;
}

const reviewCycles: ReviewCycle[] = [
  { id: "RC-001", name: "Q1 2026 Review", period: "Jan-Mar 2026", status: "active", completion: 45, participants: 248 },
  { id: "RC-002", name: "Q4 2025 Review", period: "Oct-Dec 2025", status: "approved", completion: 100, participants: 235 },
  { id: "RC-003", name: "Annual 2025", period: "Jan-Dec 2025", status: "approved", completion: 100, participants: 230 },
];

interface KPI {
  id: string;
  name: string;
  department: string;
  weight: number;
  target: string;
}

const kpis: KPI[] = [
  { id: "KPI-01", name: "Code Quality Score", department: "Engineering", weight: 25, target: ">= 90%" },
  { id: "KPI-02", name: "Sprint Velocity", department: "Engineering", weight: 20, target: ">= 40 pts" },
  { id: "KPI-03", name: "Customer Satisfaction", department: "Support", weight: 30, target: ">= 4.5/5" },
  { id: "KPI-04", name: "Revenue Target", department: "Sales", weight: 35, target: ">= $500K/mo" },
  { id: "KPI-05", name: "Time to Hire", department: "HR", weight: 25, target: "<= 30 days" },
];

const Performance = () => {
  return (
    <div>
      <PageHeader
        title="Performance"
        description="KPI tracking and performance review cycles"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" />New Review Cycle</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewCycles.map((rc) => (
                  <TableRow key={rc.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{rc.name}</p>
                      <p className="text-xs text-muted-foreground">{rc.participants} participants</p>
                    </TableCell>
                    <TableCell className="text-sm">{rc.period}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={rc.completion} className="w-16 h-1.5" />
                        <span className="text-xs text-muted-foreground">{rc.completion}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={rc.status} label={rc.status === "approved" ? "Completed" : rc.status === "active" ? "In Progress" : "Scheduled"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">KPI Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead className="text-center">Weight</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="text-sm font-medium">{kpi.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{kpi.department}</TableCell>
                    <TableCell className="text-sm text-center">{kpi.weight}%</TableCell>
                    <TableCell className="text-sm font-mono">{kpi.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Performance;
