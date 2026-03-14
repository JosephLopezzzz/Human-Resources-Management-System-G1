/**
 * Role-based access control: hierarchy, permissions, and labels.
 * System Administrator creates accounts below them in the hierarchy.
 */

export const ROLE_KEYS = [
  "system_admin",
  "hr_manager",
  "hr_officer",
  "payroll_officer",
  "finance_manager",
  "department_manager",
  "compliance_officer",
  "employee",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

/** Legacy role values stored in DB; map to canonical RoleKey */
const LEGACY_TO_CANONICAL: Record<string, RoleKey> = {
  admin: "system_admin",
  super_admin: "system_admin",
  superadmin: "system_admin",
  hr: "hr_manager",
  payroll: "payroll_officer",
  manager: "department_manager",
  security: "system_admin",
  user: "employee",
};

/** Hierarchy rank: higher = more privileged. Used to determine who can create whom. */
export const ROLE_RANK: Record<RoleKey, number> = {
  system_admin: 100,
  hr_manager: 90,
  finance_manager: 70,
  payroll_officer: 60,
  hr_officer: 50,
  department_manager: 40,
   // Compliance officer is a senior specialist role focused on audit/compliance
  compliance_officer: 35,
  employee: 10,
};

/** Display labels for UI */
export const ROLE_LABELS: Record<RoleKey, string> = {
  system_admin: "System Administrator",
  hr_manager: "HR Manager",
  hr_officer: "HR Officer / HR Staff",
  payroll_officer: "Payroll Officer",
  finance_manager: "Finance Manager / CFO",
  department_manager: "Department / Branch Manager",
  compliance_officer: "Compliance Officer",
  employee: "Employee",
};

/** Roles that can create user accounts, and which roles they may assign (must be strictly below in rank). 
 *  For BLUEPEAK, only the System Administrator may create accounts.
 */
export const CREATOR_ASSIGNABLE_ROLES: Record<RoleKey, RoleKey[]> = {
  system_admin: [
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  hr_manager: [],
  hr_officer: [],
  payroll_officer: [],
  finance_manager: [],
  department_manager: [],
  compliance_officer: [],
  employee: [],
};

/** Normalize raw role from auth to canonical RoleKey */
export function getCanonicalRole(raw: string | undefined | null): RoleKey {
  if (!raw || typeof raw !== "string") return "employee";
  const trimmed = raw.trim().toLowerCase();
  return (LEGACY_TO_CANONICAL[trimmed] as RoleKey) ?? (ROLE_KEYS.includes(trimmed as RoleKey) ? (trimmed as RoleKey) : "employee");
}

/** Whether this role has full system access (system admin) */
export function isSystemAdmin(role: RoleKey): boolean {
  return role === "system_admin";
}

/** Whether this role can access the "Create User" page and assign given role */
export function canAssignRole(creatorRole: RoleKey, assignToRole: RoleKey): boolean {
  const assignable = CREATOR_ASSIGNABLE_ROLES[creatorRole];
  return assignable.includes(assignToRole);
}

/** Roles that can access the Create User page (can create at least one role) */
export function canCreateUsers(role: RoleKey): boolean {
  return CREATOR_ASSIGNABLE_ROLES[role].length > 0;
}

/** All roles the current user is allowed to assign when creating a user */
export function getAssignableRolesFor(creatorRole: RoleKey): RoleKey[] {
  return CREATOR_ASSIGNABLE_ROLES[creatorRole] ?? [];
}

// --- Module access (for routes and sidebar) ---

export type ModuleId =
  | "dashboard"
  | "employees"
  | "departments"
  | "attendance"
  | "leave"
  | "payroll"
  | "my_pay"
  | "performance"
  | "audit_logs"
  | "role_matrix"
  | "settings"
  | "create_user";

/** Which roles can view each module (view = see in nav + open route) */
const MODULE_VIEW: Record<ModuleId, RoleKey[]> = {
  dashboard: [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  employees: ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  departments: ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  // Attendance and Leave are absolute: all roles can access.
  attendance: [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  leave: [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  payroll: ["system_admin", "hr_manager", "payroll_officer", "finance_manager"],
  my_pay: ROLE_KEYS,
  performance: ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  audit_logs: ["system_admin"],
  role_matrix: ["system_admin"],
  settings: ["system_admin"],
  create_user: ["system_admin"],
};

/** Can the role view this module (sidebar + route access) */
export function canViewModule(role: RoleKey, module: ModuleId): boolean {
  return MODULE_VIEW[module].includes(role);
}

/** Can manage (add/edit/delete) employees */
export function canManageEmployees(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "hr_officer"].includes(role);
}

/** Can manage departments */
export function canManageDepartments(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "hr_officer"].includes(role);
}

/** Can approve leave requests (all or team).
 *  Per BLUEPEAK policy this is restricted to the System Administrator.
 */
export function canApproveLeave(role: RoleKey): boolean {
  return role === "system_admin";
}

/** Can process/edit payroll (run payroll, compute, payslips) */
export function canManagePayroll(role: RoleKey): boolean {
  return ["system_admin", "payroll_officer"].includes(role);
}

/** Can approve payroll and view compensation reports (finance manager / CFO) */
export function canApprovePayrollOrViewReports(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "finance_manager"].includes(role);
}

/** Can view payroll module (own payslip or full) */
export function canViewPayroll(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "hr_officer", "payroll_officer", "finance_manager", "employee"].includes(role);
}

/** Can manage performance (reviews, KPIs) */
export function canManagePerformance(role: RoleKey): boolean {
  return ["system_admin", "hr_manager"].includes(role);
}

/** Can conduct evaluations (department manager) */
export function canConductPerformanceEvaluations(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "department_manager"].includes(role);
}

/** Can edit system settings (only system admin) */
export function canEditSettings(role: RoleKey): boolean {
  return role === "system_admin";
}

/** Can view audit logs.
 *  Restricted to System Administrator so only they see full system history.
 */
export function canViewAuditLogs(role: RoleKey): boolean {
  return role === "system_admin";
}

/** Can edit salary structure (limited for hr_officer per spec) */
export function canEditSalaryStructure(role: RoleKey): boolean {
  return ["system_admin", "hr_manager"].includes(role);
}

/** Can edit employee personal data (finance manager cannot) */
export function canEditEmployeePersonalData(role: RoleKey): boolean {
  return ["system_admin", "hr_manager", "hr_officer"].includes(role);
}

/** Role sets for RequireRole allowed lists (route guards) */
export const ROUTE_ROLES: Record<string, RoleKey[]> = {
  "/": ROLE_KEYS,
  "/employees": ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  "/departments": ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  // Route guards mirror MODULE_VIEW: everyone can reach Attendance & Leave.
  "/attendance": [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  "/leave": [
    "system_admin",
    "hr_manager",
    "hr_officer",
    "payroll_officer",
    "finance_manager",
    "department_manager",
    "compliance_officer",
    "employee",
  ],
  "/payroll": ["system_admin", "hr_manager", "payroll_officer", "finance_manager"],
  "/my-pay": ROLE_KEYS,
  "/performance": ["system_admin", "hr_manager", "hr_officer", "department_manager"],
  "/audit-logs": ["system_admin"],
  "/role-matrix": ["system_admin"],
  "/settings": ["system_admin"],
  "/admin/users/new": ["system_admin"],
  "/admin/create-admin": ["system_admin"],
};
