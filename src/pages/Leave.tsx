import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useLeaveBalances, useLeaveMutations, useLeaveRequests, useLeaveTypes } from "@/hooks/useLeave";
import { useAuth } from "@/auth/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays } from "date-fns";
import { useState } from "react";

const createLeaveSchema = z.object({
  leave_type_id: z.string().uuid("Select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
});

type CreateLeaveValues = z.infer<typeof createLeaveSchema>;

const Leave = () => {
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const isApprover = role === "admin" || role === "hr";

  const { data: types = [] } = useLeaveTypes();
  const { data: requests = [], isLoading: loadingRequests, error: requestsError } = useLeaveRequests();
  const { data: balances = [], isLoading: loadingBalances, error: balancesError } = useLeaveBalances();
  const { createRequest, creating, updateStatus, updating } = useLeaveMutations();

  const [open, setOpen] = useState(false);

  const form = useForm<CreateLeaveValues>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
    },
  });

  async function onSubmit(values: CreateLeaveValues) {
    if (!user) return;
    const start = new Date(values.start_date);
    const end = new Date(values.end_date);
    const diff = differenceInCalendarDays(end, start) + 1;
    const days = diff > 0 ? diff : 1;

    await createRequest({
      userId: user.id,
      email: user.email ?? "",
      leaveTypeId: values.leave_type_id,
      startDate: values.start_date,
      endDate: values.end_date,
      days,
    });

    setOpen(false);
    form.reset();
  }

  async function handleDecision(id: string, status: "approved" | "rejected") {
    if (!user) return;
    await updateStatus({
      id,
      status,
      approverId: user.id,
      approverEmail: user.email ?? null,
    });
  }

  const myRequests = requests.filter(
    (r) => isApprover || r.user_id === user?.id
  );

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Leave requests, balances, and approval workflows"
        actions={
          user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Leave Request</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="leave_type_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leave Type</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {types.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? "Submitting..." : "Submit"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Tabs defaultValue="requests">
        <TabsList className="mb-4">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-4">
              {loadingRequests && (
                <div className="text-sm text-muted-foreground mb-4">
                  Loading leave requests...
                </div>
              )}
              {requestsError && (
                <div className="text-sm text-destructive mb-4">
                  Failed to load leave requests.
                </div>
              )}

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
                  {myRequests.map((lr) => (
                    <TableRow key={lr.id}>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {lr.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {lr.user_email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lr.leave_types?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {lr.start_date}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {lr.end_date}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {lr.days}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lr.approver_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lr.status} />
                      </TableCell>
                      <TableCell>
                        {isApprover && lr.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updating}
                              onClick={() => handleDecision(lr.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updating}
                              onClick={() => handleDecision(lr.id, "rejected")}
                            >
                              Reject
                            </Button>
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
              <CardTitle className="text-base">
                Leave Balance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalances && (
                <div className="text-sm text-muted-foreground mb-4">
                  Loading balances...
                </div>
              )}
              {balancesError && (
                <div className="text-sm text-destructive mb-4">
                  Failed to load balances.
                </div>
              )}

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
                  {balances.map((lb) => {
                    const remaining =
                      lb.total_days - lb.used_days - lb.pending_days;
                    return (
                      <TableRow key={lb.id}>
                        <TableCell className="text-sm font-medium">
                          {lb.leave_types?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm text-center">
                          {lb.total_days}
                        </TableCell>
                        <TableCell className="text-sm text-center">
                          {lb.used_days}
                        </TableCell>
                        <TableCell className="text-sm text-center">
                          {lb.pending_days}
                        </TableCell>
                        <TableCell className="text-sm text-center font-medium">
                          {remaining}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
