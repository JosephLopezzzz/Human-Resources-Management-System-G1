import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  DollarSign,
  WalletCards,
  Target,
  ScrollText,
  Settings,
  ChevronLeft,
  LogOut,
  UserPlus,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canViewModule, isSystemAdmin, type RoleKey } from "@/auth/roles";
import { motion, AnimatePresence } from "framer-motion";

const navItems: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  module: "dashboard" | "employees" | "departments" | "attendance" | "leave" | "payroll" | "my_pay" | "performance" | "audit_logs";
}[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { to: "/employees", icon: Users, label: "Employees", module: "employees" },
  { to: "/departments", icon: Building2, label: "Departments", module: "departments" },
  { to: "/attendance", icon: Clock, label: "Attendance", module: "attendance" },
  { to: "/leave", icon: CalendarDays, label: "Leave", module: "leave" },
  { to: "/payroll", icon: DollarSign, label: "Payroll", module: "payroll" },
  { to: "/my-pay", icon: WalletCards, label: "My Pay", module: "my_pay" },
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
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-hidden",
        "shadow-sm"
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-sidebar-primary font-bold text-lg tracking-tight">
            BLUEPEAK
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
        <AnimatePresence initial={false}>
          {visibleNavItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <NavLink
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-md bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </span>
              </NavLink>
            </motion.div>
          );
        })}
        </AnimatePresence>
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
        <NavLink
          to="/mfa"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Shield className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Two-factor auth</span>}
        </NavLink>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
}
