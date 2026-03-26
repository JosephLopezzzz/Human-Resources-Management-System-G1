import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import { useReviewCycles, useKpis, usePerformanceMutations } from "@/hooks/usePerformance";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canManagePerformance, canConductPerformanceEvaluations } from "@/auth/roles";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import { useParticipants, useParticipantScores } from "@/hooks/usePerformance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users as UsersIcon } from "lucide-react";

const createCycleSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  period: z.string().min(1, "Period is required"),
});

type CreateCycleValues = z.infer<typeof createCycleSchema>;

const Performance = () => {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const canManage = canManagePerformance(role);
  const canEvaluate = canConductPerformanceEvaluations(role);
  
  const { employees = [] } = useEmployees();
  const { data: cycles = [], isLoading: cyclesLoading, error: cyclesError } = useReviewCycles();
  const { data: kpis = [], isLoading: kpisLoading, error: kpisError } = useKpis();
  const { createCycle, creatingCycle, addParticipant, addingParticipant, updateScore, updatingScore } = usePerformanceMutations();

  const [open, setOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [scoringParticipantId, setScoringParticipantId] = useState<string | null>(null);
  const [scoringOpen, setScoringOpen] = useState(false);

  const { data: participants = [], isLoading: participantsLoading } = useParticipants(selectedCycleId);
  const { data: currentScores = [] } = useParticipantScores(scoringParticipantId);

  const form = useForm<CreateCycleValues>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      code: "",
      name: "",
      period: "",
    },
  });

  async function onSubmit(values: CreateCycleValues) {
    try {
      await createCycle(values);
      toast({
        title: "Review cycle created",
        description: values.name,
      });
      setOpen(false);
      form.reset();
    } catch (err) {
      toast({
        title: "Failed to create review cycle",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCycleId(rc.id);
                            setParticipantsOpen(true);
                          }}
                        >
                          <UsersIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                          Participants
                        </Button>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- Participants Dialog --- */}
        <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cycle Participants</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {canManage && (
                <div className="flex gap-2">
                  <Select onValueChange={(v) => addParticipant({ cycleId: selectedCycleId!, employeeId: v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add employee to cycle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(e => !participants.some(p => p.employee_id === e.id))
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button disabled={addingParticipant}>
                    {addingParticipant ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantsLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : participants.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No participants yet.</TableCell></TableRow>
                  ) : (
                    participants.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.employee?.first_name} {p.employee?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{p.employee?.email}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                        <TableCell className="text-right font-mono font-medium">{p.score}%</TableCell>
                        <TableCell className="text-right">
                          {canEvaluate && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setScoringParticipantId(p.id);
                                setScoringOpen(true);
                              }}
                            >
                              Evaluate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- Scoring Dialog --- */}
        <Dialog open={scoringOpen} onOpenChange={setScoringOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Performance Evaluation</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {kpis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No KPIs defined for scoring.</div>
              ) : (
                kpis.map((kpi) => {
                  const currentScore = currentScores.find(s => s.kpi_id === kpi.id);
                  return (
                    <div key={kpi.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold">{kpi.name} ({kpi.weight}%)</label>
                        <span className="text-xs text-muted-foreground">Target: {kpi.target}</span>
                      </div>
                      <div className="flex gap-3">
                        <Input 
                          type="number" 
                          placeholder="Score (0-100)" 
                          className="w-32"
                          defaultValue={currentScore?.score ?? 0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateScore({
                                participantId: scoringParticipantId!,
                                kpiId: kpi.id,
                                score: val
                              });
                            }
                          }}
                        />
                        <Input 
                          placeholder="Notes..." 
                          className="flex-1"
                          defaultValue={currentScore?.notes ?? ""}
                          onBlur={(e) => {
                            updateScore({
                              participantId: scoringParticipantId!,
                              kpiId: kpi.id,
                              score: currentScore?.score ?? 0,
                              notes: e.target.value
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setScoringOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
