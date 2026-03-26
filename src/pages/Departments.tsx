import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ObfuscatedValue } from "@/components/ObfuscatedValue";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, ChevronRight, UserCheck } from "lucide-react";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canManageDepartments } from "@/auth/roles";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

const createDepartmentSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  budget_amount: z.string().optional(),
  budget_currency: z.string().min(1, "Currency is required"),
  manager_user_id: z.string().nullable().optional(),
});

type CreateDepartmentValues = z.infer<typeof createDepartmentSchema>;

const Departments = () => {
  const { departments, isLoading, error, createDepartment, creating } = useDepartments();
  const { employees } = useEmployees();

  // Build employee count per department
  const empCountByDept = employees.reduce(
    (acc, e) => {
      if (e.department_id) acc[e.department_id] = (acc[e.department_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Build a lookup for manager names by their user_id
  const managerNameById = employees.reduce(
    (acc, e) => {
      if ((e as any).user_id) {
        acc[(e as any).user_id] = `${e.first_name} ${e.last_name}`;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  const { user } = useAuth();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const canManage = canManageDepartments(role);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = departments.filter((d) => {
    const term = search.toLowerCase();
    const haystack = `${d.name} ${d.code}`.toLowerCase();
    return haystack.includes(term);
  });

  const form = useForm<CreateDepartmentValues>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      code: "",
      name: "",
      budget_amount: "",
      budget_currency: "PHP",
      manager_user_id: null,
    },
  });

  async function onSubmit(values: CreateDepartmentValues) {
    const numericBudget = values.budget_amount
      ? Number(values.budget_amount.replace(/,/g, ""))
      : null;

    try {
      await createDepartment({
        code: values.code,
        name: values.name,
        manager_user_id: values.manager_user_id || null,
        parent_id: null,
        budget_amount: numericBudget,
        budget_currency: values.budget_currency,
      });

      toast({
        title: "Department created",
        description: `${values.name} has been added.`,
      });

      setOpen(false);
      form.reset();
    } catch (err) {
      toast({
        title: "Failed to create department",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational structure and department management"
        breadcrumb={<span>Home / Departments</span>}
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Department</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                              <Input placeholder="D-001" {...field} />
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
                              <Input placeholder="Investment Banking" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="budget_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="budget_currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormControl>
                              <Input placeholder="PHP" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {/* Manager selection */}
                    <FormField
                      control={form.control}
                      name="manager_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department Manager</FormLabel>
                          <Select
                            value={field.value ?? "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a manager (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Manager</SelectItem>
                              {employees.map((emp) => (
                                <SelectItem key={(emp as any).user_id ?? emp.id} value={(emp as any).user_id ?? emp.id}>
                                  {emp.first_name} {emp.last_name}
                                  <span className="ml-2 text-xs text-muted-foreground">— {emp.position}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        {creating ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card>
        <CardContent className="pt-4">
          {error && (
            <div className="text-sm text-destructive mb-4">
              Failed to load departments.
            </div>
          )}

          <div className="flex gap-3 mb-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No departments yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((dept) => {
                  const managerName = dept.manager_user_id
                    ? managerNameById[dept.manager_user_id] ?? "—"
                    : "—";
                  return (
                    <TableRow key={dept.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{dept.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{dept.code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {managerName !== "—" ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            <span>{managerName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {empCountByDept[dept.id] ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        <ObfuscatedValue
                          className="justify-end w-full"
                          auditLabel={`Budget for ${dept.name}`}
                          category="payroll"
                          entityId={dept.id}
                          entityType="DEPARTMENT_BUDGET"
                        >
                          {dept.budget_amount != null
                            ? dept.budget_amount
                                .toLocaleString(undefined, {
                                  style: "currency",
                                  currency: dept.budget_currency || "PHP",
                                })
                                .replace(/\$/g, "₱")
                            : "—"}
                        </ObfuscatedValue>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
