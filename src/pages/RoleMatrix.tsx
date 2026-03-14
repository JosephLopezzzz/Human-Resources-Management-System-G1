import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_KEYS, ROLE_LABELS, canViewModule, canApproveLeave, isSystemAdmin, type RoleKey } from "@/auth/roles";
import { Check, Minus } from "lucide-react";

const CAPABILITIES = [
  {
    id: "attendance_self",
    label: "Attendance – own history",
    isEnabled: (role: RoleKey) => canViewModule(role, "attendance"),
  },
  {
    id: "attendance_all",
    label: "Attendance – all users",
    isEnabled: (role: RoleKey) => role === "system_admin",
  },
  {
    id: "attendance_export",
    label: "Attendance – export CSV",
    isEnabled: (role: RoleKey) => role === "system_admin",
  },
  {
    id: "leave_self",
    label: "Leave – request & history (own)",
    isEnabled: (role: RoleKey) => canViewModule(role, "leave"),
  },
  {
    id: "leave_approve",
    label: "Leave – approve / export",
    isEnabled: (role: RoleKey) => canApproveLeave(role),
  },
  {
    id: "leave_balances_all",
    label: "Leave – all balances",
    isEnabled: (role: RoleKey) => isSystemAdmin(role),
  },
  {
    id: "audit_logs",
    label: "Audit logs – view system history",
    isEnabled: (role: RoleKey) => isSystemAdmin(role),
  },
];

const RoleMatrix = () => {
  return (
    <div>
      <PageHeader
        title="Role access matrix"
        description="Overview of what each role can see and do in Attendance, Leave, and Audit Logs."
        breadcrumb={<span>Home / Role Access</span>}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Capabilities by role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Role</TableHead>
                  {CAPABILITIES.map((cap) => (
                    <TableHead key={cap.id} className="min-w-[160px] text-xs">
                      {cap.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_KEYS.map((role) => (
                  <TableRow key={role}>
                    <TableCell className="text-sm font-medium">{ROLE_LABELS[role]}</TableCell>
                    {CAPABILITIES.map((cap) => {
                      const enabled = cap.isEnabled(role);
                      return (
                        <TableCell key={cap.id} className="text-center">
                          {enabled ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-500" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleMatrix;

