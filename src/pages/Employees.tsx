import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ObfuscatedValue } from "@/components/ObfuscatedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Download, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { useEmployees, type EmployeeWithDept } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/auth/useAuth";
import { useAudit } from "@/hooks/useAudit";
import {
  getCanonicalRole,
  canManageEmployees,
  canEditEmployeePersonalData,
  canEditEmployeeSalary,
  canEditEmployeeStatus,
} from "@/auth/roles";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/use-toast";

// ---- Schemas ----
const createEmployeeSchema = z.object({
  employee_code: z.string().min(1, "Employee ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  position: z.string().min(1, "Position is required"),
  department_id: z.string().uuid().nullable().optional(),
  status: z.enum(["regular", "probation", "suspended", "terminated", "resigned"]),
  join_date: z.string().optional(),
  salary_amount: z.string().min(1, "Salary is required"),
  salary_currency: z.string().min(1, "Currency is required"),
  allowances: z.string().default("0"),
  deductions: z.string().default("0"),
});
type CreateEmployeeValues = z.infer<typeof createEmployeeSchema>;

const editEmployeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  position: z.string().min(1, "Position is required"),
  department_id: z.string().uuid().nullable().optional(),
  status: z.enum(["regular", "probation", "suspended", "terminated", "resigned"]),
  join_date: z.string().optional(),
  salary_amount: z.string().min(1, "Salary is required"),
  salary_currency: z.string().min(1, "Currency is required"),
  allowances: z.string().default("0"),
  deductions: z.string().default("0"),
});
type EditEmployeeValues = z.infer<typeof editEmployeeSchema>;

// ---- Edit Dialog ----
function EditEmployeeDialog({
  emp,
  departments,
  canEditSalary,
  canEditStatus,
  onSave,
  saving,
}: {
  emp: EmployeeWithDept;
  departments: { id: string; name: string }[];
  canEditSalary: boolean;
  canEditStatus: boolean;
  onSave: (values: EditEmployeeValues) => Promise<void>;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<EditEmployeeValues>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position,
      department_id: emp.department_id ?? null,
      status: emp.status,
      join_date: emp.join_date ?? "",
      salary_amount: String(emp.salary_amount),
      salary_currency: emp.salary_currency,
      allowances: String(emp.allowances ?? 0),
      deductions: String(emp.deductions ?? 0),
    },
  });

  // Reset form when emp changes
  useEffect(() => {
    form.reset({
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position,
      department_id: emp.department_id ?? null,
      status: emp.status,
      join_date: emp.join_date ?? "",
      salary_amount: String(emp.salary_amount),
      salary_currency: emp.salary_currency,
      allowances: String(emp.allowances ?? 0),
      deductions: String(emp.deductions ?? 0),
    });
  }, [emp, form]);

  async function handleSubmit(values: EditEmployeeValues) {
    await onSave(values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit employee">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit — {emp.first_name} {emp.last_name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem>
                  <FormLabel>Position / Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="join_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Join Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEditStatus}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                      </SelectContent>
                    </Select>
                    {!canEditStatus && (
                      <p className="text-xs text-muted-foreground">Only HR Managers and Admins can change status.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={!canEditSalary}
                        {...field}
                      />
                    </FormControl>
                    {!canEditSalary && (
                      <p className="text-xs text-muted-foreground">Only Admins can edit salary.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="salary_currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="PHP" disabled={!canEditSalary} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="allowances" render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowances</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" disabled={!canEditSalary} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="deductions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard Deductions</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" disabled={!canEditSalary} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Page ----
const Employees = () => {
  const { employees, isLoading, error, createEmployee, creating, updateEmployee, updating } = useEmployees();
  const { departments } = useDepartments();
  const { user } = useAuth();
  const { logEvent } = useAudit();
  const role = getCanonicalRole(user?.user_metadata?.role as string | undefined);
  const canManage = canManageEmployees(role);
  const canEdit = canEditEmployeePersonalData(role);
  const canSalary = canEditEmployeeSalary(role);
  const canStatus = canEditEmployeeStatus(role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const form = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employee_code: "",
      first_name: "",
      last_name: "",
      email: "",
      position: "",
      department_id: null,
      status: "regular",
      join_date: "",
      salary_amount: "",
      salary_currency: "PHP",
      allowances: "0",
      deductions: "0",
    },
  });

  async function onSubmit(values: CreateEmployeeValues) {
    const salaryStr = String(values.salary_amount).replace(/,/g, "");
    const numericSalary = parseFloat(salaryStr);

    try {
      await createEmployee({
        employee_code: values.employee_code,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        position: values.position,
        department_id: values.department_id || null,
        status: values.status,
        join_date: values.join_date || new Date().toISOString().slice(0, 10),
        salary_amount: isNaN(numericSalary) ? 0 : numericSalary,
        salary_currency: values.salary_currency,
        allowances: parseFloat(values.allowances) || 0,
        deductions: parseFloat(values.deductions) || 0,
      });

      toast({
        title: "Employee created",
        description: `${values.first_name} ${values.last_name} has been added.`,
      });

      setOpen(false);
      form.reset();
    } catch (err: any) {
      console.error("Error creating employee:", err);
      toast({
        title: "Failed to create employee",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function handleEditSave(emp: EmployeeWithDept, values: EditEmployeeValues) {
    const salary = parseFloat(String(values.salary_amount).replace(/,/g, ""));
    try {
      const payload: Record<string, any> = {
        id: emp.id,
        first_name: values.first_name,
        last_name: values.last_name,
        position: values.position,
        department_id: values.department_id || null,
        join_date: values.join_date || emp.join_date,
      };
      if (canStatus) payload.status = values.status;
      if (canSalary) {
        payload.salary_amount = isNaN(salary) ? emp.salary_amount : salary;
        payload.salary_currency = values.salary_currency;
        payload.allowances = parseFloat(values.allowances) || 0;
        payload.deductions = parseFloat(values.deductions) || 0;
      }

      await updateEmployee(payload as any);

      logEvent(
        `EMPLOYEE_EDIT: Updated record for ${values.first_name} ${values.last_name}`,
        "employee",
        "EMPLOYEE_RECORD",
        emp.id
      );

      toast({ title: "Saved", description: `${values.first_name} ${values.last_name} updated.` });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message || "Something went wrong.", variant: "destructive" });
    }
  }

  const filtered = employees.filter((e) => {
    const fullName = `${e.first_name} ${e.last_name}`;
    const matchesSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function handleExport() {
    const count = filtered.length;
    if (count > 50) {
      logEvent(
        `DLP_MASS_EXPORT: High-volume data export attempted (${count} records)`,
        "system",
        "EMPLOYEE_EXPORT",
        undefined,
        { record_count: count, severity: "HIGH" }
      );
    } else {
      logEvent(
        `DATA_EXPORT: Exported ${count} employee records`,
        "employee",
        "EMPLOYEE_EXPORT",
        undefined,
        { record_count: count, severity: "LOW" }
      );
    }

    const headers = ["Employee ID", "First Name", "Last Name", "Email", "Department", "Position", "Status", "Join Date", "Salary"];
    const rows = filtered.map((e) => [
      e.employee_code,
      e.first_name,
      e.last_name,
      e.email,
      (e as any).department_name ?? "",
      e.position,
      e.status,
      e.join_date ?? "",
      e.salary_amount,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records and lifecycle"
        breadcrumb={<span>Home / Employees</span>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            {canManage && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Employee</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="employee_code" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee ID</FormLabel>
                            <FormControl><Input placeholder="EMP-001" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="user@company.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="first_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="last_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="position" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl><Input placeholder="Financial Analyst" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="department_id" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select
                              value={field.value ?? "none"}
                              onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                            >
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Department</SelectItem>
                                {departments.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="probation">Probation</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="terminated">Terminated</SelectItem>
                                <SelectItem value="resigned">Resigned</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="join_date" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Join Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="salary_amount" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salary</FormLabel>
                            <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
              <FormField control={form.control} name="salary_currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl><Input placeholder="PHP" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="allowances" render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowances</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="deductions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard Deductions</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="pt-4">
          {error && (
            <div className="text-sm text-destructive mb-4">Failed to load employees.</div>
          )}

          <div className="flex gap-3 mb-4 items-center">
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
                {canEdit && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canEdit ? 8 : 7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="py-6 text-center text-sm text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {`${emp.first_name} ${emp.last_name}`.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{emp.employee_code}</TableCell>
                    <TableCell className="text-sm">{(emp as any).department_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{emp.position}</TableCell>
                    <TableCell><StatusBadge status={emp.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.join_date ? format(new Date(emp.join_date), "yyyy-MM-dd") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      <ObfuscatedValue
                        className="justify-end w-full"
                        auditLabel={`Salary for ${emp.first_name} ${emp.last_name}`}
                        category="employee"
                        entityId={emp.id}
                        entityType="EMPLOYEE_SALARY"
                      >
                        {emp.salary_amount
                          .toLocaleString(undefined, { style: "currency", currency: emp.salary_currency || "PHP" })
                          .replace(/\$/g, "₱")}
                      </ObfuscatedValue>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <EditEmployeeDialog
                          emp={emp}
                          departments={departments}
                          canEditSalary={canSalary}
                          canEditStatus={canStatus}
                          onSave={(values) => handleEditSave(emp, values)}
                          saving={updating}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              Showing {paginated.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, filtered.length)} of {filtered.length} employees
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || filtered.length === 0}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
