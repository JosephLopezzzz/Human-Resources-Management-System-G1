import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useLeaveBalances, useLeaveMutations, useLeaveRequests, useLeaveTypes } from "@/hooks/useLeave";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canApproveLeave, isSystemAdmin } from "@/auth/roles";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays } from "date-fns";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";

const createLeaveSchema = z.object({
  leave_type_id: z.string().uuid("Select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  description: z
    .string()
    .min(5, "Please provide a short description")
    .max(500, "Description is too long"),
});

type CreateLeaveValues = z.infer<typeof createLeaveSchema>;

const Leave = () => {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const isApprover = canApproveLeave(role);
  const canExport = isApprover || isSystemAdmin(role);

  const { data: types = [] } = useLeaveTypes();
  const { data: requests = [], isLoading: loadingRequests, error: requestsError, refetch: refetchRequests } = useLeaveRequests();
  const { data: balances = [], isLoading: loadingBalances, error: balancesError } = useLeaveBalances();
  const { createRequest, creating, updateStatus, updating } = useLeaveMutations();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const form = useForm<CreateLeaveValues>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  });

  async function onSubmit(values: CreateLeaveValues) {
    if (!user) return;
    const start = new Date(values.start_date);
    const end = new Date(values.end_date);
    const diff = differenceInCalendarDays(end, start) + 1;
    const days = diff > 0 ? diff : 1;

    try {
      await createRequest({
        userId: user.id,
        email: user.email ?? "",
        leaveTypeId: values.leave_type_id,
        startDate: values.start_date,
        endDate: values.end_date,
        days,
        description: values.description,
      });

      toast({
        title: "Leave request submitted",
        description: `Requested ${days} day(s) of leave.`,
      });

      setOpen(false);
      form.reset();
    } catch (err) {
      toast({
        title: "Failed to submit leave request",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function handleDecision(id: string, status: "approved" | "rejected") {
    if (!user) return;
    console.log("Decision Triggered:", { id, status, approverId: user.id });
    try {
      await updateStatus({
        id,
        status,
        approverId: user.id,
        approverEmail: user.email ?? null,
      });
      console.log("Status update successful");

      toast({
        title: `Request ${status}`,
        description: `Leave request has been ${status}.`,
      });
    } catch (err) {
      toast({
        title: "Failed to update request",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  const myRequests = requests.filter(
    (r) => isApprover || r.user_id === user?.id
  );

  const filteredRequests = myRequests.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      r.user_email?.toLowerCase().includes(term) ||
      r.leave_types?.name?.toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Leave requests, balances, and approval workflows"
        breadcrumb={<span>Home / Leave</span>}
        actions={
          user && (
            <>
              {canExport && filteredRequests.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mr-2"
                  onClick={() => {
                    const header = [
                      "ID",
                      "Employee",
                      "Type",
                      "From",
                      "To",
                      "Days",
                      "Description",
                      "Approver",
                      "Status",
                    ];
                    const rows = filteredRequests.map((lr) => [
                      lr.id,
                      lr.user_email ?? "",
                      lr.leave_types?.name ?? "",
                      lr.start_date,
                      lr.end_date,
                      String(lr.days),
                      lr.description ?? "",
                      lr.approver_email ?? "",
                      lr.status,
                    ]);
                    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "leave-requests.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </Button>
              )}
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

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason / description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Briefly explain the reason for this leave..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
            </>
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
              {requestsError && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-sm text-destructive flex-1">Failed to load leave requests. If you have other tabs open, try closing them and retry.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchRequests()} disabled={loadingRequests}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                </div>
              )}

              <div className="flex gap-3 mb-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee or type..."
                    className="pl-8 h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as "all" | "pending" | "approved" | "rejected")
                  }
                >
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRequests
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={10}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : filteredRequests.length === 0
                      ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No leave requests found.
                          </TableCell>
                        </TableRow>
                        )
                      : filteredRequests.map((lr) => (
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
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        {lr.description ?? "—"}
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
