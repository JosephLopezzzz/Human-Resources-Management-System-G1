import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronRight } from "lucide-react";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/auth/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const createDepartmentSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  budget_amount: z.string().optional(),
  budget_currency: z.string().min(1, "Currency is required"),
});

type CreateDepartmentValues = z.infer<typeof createDepartmentSchema>;

const Departments = () => {
  const { departments, isLoading, error, createDepartment, creating } = useDepartments();
  const { user } = useAuth();
  const role = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const canManage = role === "admin" || role === "hr";

  const [open, setOpen] = useState(false);

  const form = useForm<CreateDepartmentValues>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      code: "",
      name: "",
      budget_amount: "",
      budget_currency: "USD",
    },
  });

  async function onSubmit(values: CreateDepartmentValues) {
    const numericBudget = values.budget_amount
      ? Number(values.budget_amount.replace(/,/g, ""))
      : null;

    await createDepartment({
      code: values.code,
      name: values.name,
      manager_user_id: null,
      parent_id: null,
      budget_amount: numericBudget,
      budget_currency: values.budget_currency,
    });

    setOpen(false);
    form.reset();
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational structure and department management"
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
                              <Input placeholder="Engineering" {...field} />
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
                              <Input placeholder="USD" {...field} />
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
          {isLoading && (
            <div className="text-sm text-muted-foreground mb-4">
              Loading departments...
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive mb-4">
              Failed to load departments.
            </div>
          )}

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
                      <p className="text-xs text-muted-foreground font-mono">{dept.code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">—</TableCell>
                  <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  <TableCell className="text-sm text-center">—</TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {dept.budget_amount != null
                      ? dept.budget_amount.toLocaleString(undefined, {
                          style: "currency",
                          currency: dept.budget_currency || "USD",
                        })
                      : "—"}
                  </TableCell>
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
