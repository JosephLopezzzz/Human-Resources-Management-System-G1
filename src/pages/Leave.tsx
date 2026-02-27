import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

type LeaveStatus = "approved" | "pending" | "rejected";

interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
  approver: string;
}

const leaveRequests: LeaveRequest[] = [
  { id: "LR-101", employee: "John Smith", type: "Annual", from: "2026-03-01", to: "2026-03-05", days: 5, status: "pending", approver: "David Brown" },
  { id: "LR-102", employee: "Sarah Connor", type: "Sick", from: "2026-02-25", to: "2026-02-26", days: 2, status: "approved", approver: "Tom Harris" },
  { id: "LR-103", employee: "Mike Johnson", type: "Annual", from: "2026-03-10", to: "2026-03-14", days: 5, status: "pending", approver: "David Brown" },
  { id: "LR-104", employee: "Emily Davis", type: "Personal", from: "2026-02-20", to: "2026-02-20", days: 1, status: "rejected", approver: "HR Admin" },
  { id: "LR-105", employee: "Robert Wilson", type: "Annual", from: "2026-04-01", to: "2026-04-10", days: 8, status: "pending", approver: "Finance Lead" },
];

const leaveBalances = [
  { type: "Annual Leave", total: 20, used: 8, pending: 5, remaining: 7 },
  { type: "Sick Leave", total: 12, used: 3, pending: 0, remaining: 9 },
  { type: "Personal Leave", total: 5, used: 2, pending: 0, remaining: 3 },
  { type: "Maternity/Paternity", total: 90, used: 0, pending: 0, remaining: 90 },
];

const Leave = () => {
  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Leave requests, balances, and approval workflows"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" />New Request</Button>}
      />

      <Tabs defaultValue="requests">
        <TabsList className="mb-4">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((lr) => (
                    <TableRow key={lr.id}>
                      <TableCell className="text-sm font-mono text-muted-foreground">{lr.id}</TableCell>
                      <TableCell className="text-sm font-medium">{lr.employee}</TableCell>
                      <TableCell className="text-sm">{lr.type}</TableCell>
                      <TableCell className="text-sm font-mono">{lr.from}</TableCell>
                      <TableCell className="text-sm font-mono">{lr.to}</TableCell>
                      <TableCell className="text-sm text-center">{lr.days}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lr.approver}</TableCell>
                      <TableCell><StatusBadge status={lr.status} /></TableCell>
                      <TableCell>
                        {lr.status === "pending" && (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs">Approve</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs">Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leave Balance Summary (Company Average)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Used</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveBalances.map((lb) => (
                    <TableRow key={lb.type}>
                      <TableCell className="text-sm font-medium">{lb.type}</TableCell>
                      <TableCell className="text-sm text-center">{lb.total}</TableCell>
                      <TableCell className="text-sm text-center">{lb.used}</TableCell>
                      <TableCell className="text-sm text-center">{lb.pending}</TableCell>
                      <TableCell className="text-sm text-center font-medium">{lb.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leave;
