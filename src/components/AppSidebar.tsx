import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  DollarSign,
  Target,
  ScrollText,
  Settings,
  ChevronLeft,
  LogOut,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canViewModule, isSystemAdmin, type RoleKey } from "@/auth/roles";

const navItems: { to: string; icon: typeof LayoutDashboard; label: string; module: "dashboard" | "employees" | "departments" | "attendance" | "leave" | "payroll" | "performance" | "audit_logs" }[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { to: "/employees", icon: Users, label: "Employees", module: "employees" },
  { to: "/departments", icon: Building2, label: "Departments", module: "departments" },
  { to: "/attendance", icon: Clock, label: "Attendance", module: "attendance" },
  { to: "/leave", icon: CalendarDays, label: "Leave", module: "leave" },
  { to: "/payroll", icon: DollarSign, label: "Payroll", module: "payroll" },
  { to: "/performance", icon: Target, label: "Performance", module: "performance" },
  { to: "/audit-logs", icon: ScrollText, label: "Audit Logs", module: "audit_logs" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const rawRole = (user?.user_metadata?.role as string | undefined) ?? "employee";
  const role = getCanonicalRole(rawRole) as RoleKey;
  const visibleNavItems = navItems.filter((item) => canViewModule(role, item.module));
  const canAccessCreateUser = canViewModule(role, "create_user");
  const canAccessCreateAdmin = isSystemAdmin(role);
  const canAccessSettings = canViewModule(role, "settings");

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-sidebar-primary font-bold text-lg tracking-tight">
            HRMS
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-sidebar-accent text-sidebar-muted"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border">
        {canAccessCreateUser && (
          <NavLink
            to="/admin/users/new"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Create User</span>}
          </NavLink>
        )}
        {canAccessCreateAdmin && (
          <NavLink
            to="/admin/create-admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Create Admin</span>}
          </NavLink>
        )}
        {canAccessSettings && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
