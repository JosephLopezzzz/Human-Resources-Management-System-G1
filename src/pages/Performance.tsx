import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import { useReviewCycles, useKpis, usePerformanceMutations } from "@/hooks/usePerformance";
import { useAuth } from "@/auth/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

const createCycleSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  period: z.string().min(1, "Period is required"),
});

type CreateCycleValues = z.infer<typeof createCycleSchema>;

const Performance = () => {
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const canManage = role === "admin" || role === "hr";

  const { data: cycles = [], isLoading: cyclesLoading, error: cyclesError } = useReviewCycles();
  const { data: kpis = [], isLoading: kpisLoading, error: kpisError } = useKpis();
  const { createCycle, creatingCycle } = usePerformanceMutations();

  const [open, setOpen] = useState(false);

  const form = useForm<CreateCycleValues>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      code: "",
      name: "",
      period: "",
    },
  });

  async function onSubmit(values: CreateCycleValues) {
    await createCycle(values);
    setOpen(false);
    form.reset();
  }

  return (
    <div>
      <PageHeader
        title="Performance"
        description="KPI tracking and performance review cycles"
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Review Cycle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Review Cycle</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Q1-2026" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Q1 2026 Review" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period</FormLabel>
                          <FormControl>
                            <Input placeholder="Jan-Mar 2026" {...field} />
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
                      <Button type="submit" disabled={creatingCycle}>
                        {creatingCycle ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {cyclesLoading && (
              <div className="text-sm text-muted-foreground mb-4">
                Loading review cycles...
              </div>
            )}
            {cyclesError && (
              <div className="text-sm text-destructive mb-4">
                Failed to load review cycles.
              </div>
            )}

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
                {cycles.map((rc) => (
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
                    <TableCell>
                      <StatusBadge
                        status={rc.status}
                        label={
                          rc.status === "approved"
                            ? "Completed"
                            : rc.status === "active"
                            ? "In Progress"
                            : "Scheduled"
                        }
                      />
                    </TableCell>
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
            {kpisLoading && (
              <div className="text-sm text-muted-foreground mb-4">
                Loading KPIs...
              </div>
            )}
            {kpisError && (
              <div className="text-sm text-destructive mb-4">
                Failed to load KPIs.
              </div>
            )}

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
