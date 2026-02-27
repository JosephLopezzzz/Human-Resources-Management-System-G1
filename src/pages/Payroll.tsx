import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Lock, FileText, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PayrollRecord {
  id: string;
  employee: string;
  baseSalary: string;
  allowances: string;
  deductions: string;
  tax: string;
  netPay: string;
  status: "approved" | "pending" | "draft";
}

const payrollRecords: PayrollRecord[] = [
  { id: "EMP-001", employee: "John Smith", baseSalary: "$7,917", allowances: "$500", deductions: "$200", tax: "$1,643", netPay: "$6,574", status: "approved" },
  { id: "EMP-002", employee: "Sarah Connor", baseSalary: "$6,833", allowances: "$400", deductions: "$150", tax: "$1,417", netPay: "$5,666", status: "approved" },
  { id: "EMP-003", employee: "Mike Johnson", baseSalary: "$5,417", allowances: "$300", deductions: "$100", tax: "$1,123", netPay: "$4,494", status: "pending" },
  { id: "EMP-004", employee: "Emily Davis", baseSalary: "$5,833", allowances: "$350", deductions: "$120", tax: "$1,213", netPay: "$4,850", status: "approved" },
  { id: "EMP-005", employee: "Robert Wilson", baseSalary: "$6,250", allowances: "$400", deductions: "$180", tax: "$1,294", netPay: "$5,176", status: "draft" },
  { id: "EMP-007", employee: "David Brown", baseSalary: "$10,000", allowances: "$800", deductions: "$300", tax: "$2,100", netPay: "$8,400", status: "approved" },
];

const Payroll = () => {
  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Monthly payroll processing and salary management"
        actions={
          <>
            <Button variant="outline" size="sm"><Lock className="h-4 w-4 mr-1" />Lock Payroll</Button>
            <Button size="sm"><FileText className="h-4 w-4 mr-1" />Generate Payroll</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} title="Total Gross" value="$1,245,000" change="February 2026" changeType="neutral" />
        <StatCard icon={DollarSign} title="Total Net" value="$987,400" change="After deductions" changeType="neutral" />
        <StatCard icon={AlertTriangle} title="Pending" value={3} change="Needs approval" changeType="negative" />
        <StatCard icon={Lock} title="Status" value="Unlocked" change="Ready for processing" changeType="neutral" />
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList className="mb-4">
          <TabsTrigger value="breakdown">Salary Breakdown</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">February 2026 Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{pr.employee}</p>
                        <p className="text-xs text-muted-foreground font-mono">{pr.id}</p>
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">{pr.baseSalary}</TableCell>
                      <TableCell className="text-sm text-right font-mono text-success">{pr.allowances}</TableCell>
                      <TableCell className="text-sm text-right font-mono text-destructive">{pr.deductions}</TableCell>
                      <TableCell className="text-sm text-right font-mono text-destructive">{pr.tax}</TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold">{pr.netPay}</TableCell>
                      <TableCell><StatusBadge status={pr.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground text-sm py-12">
              Payroll history will be available once connected to a database.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payroll;
