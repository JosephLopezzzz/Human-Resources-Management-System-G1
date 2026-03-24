import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  PhilippinePeso,
  WalletCards,
  Target,
  ScrollText,
  Settings,
  LogOut,
  UserPlus,
  ShieldCheck,
  Shield,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { useAuth } from "@/auth/useAuth";
import { getCanonicalRole, canViewModule, isSystemAdmin, type RoleKey } from "@/auth/roles";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./theme-provider";

const navItems: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  module:
    | "dashboard"
    | "employees"
    | "departments"
    | "attendance"
    | "leave"
    | "payroll"
    | "my_pay"
    | "performance"
    | "audit_logs"
    | "role_matrix";
}[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { to: "/employees", icon: Users, label: "Employees", module: "employees" },
  { to: "/departments", icon: Building2, label: "Departments", module: "departments" },
  { to: "/attendance", icon: Clock, label: "Attendance", module: "attendance" },
  { to: "/leave", icon: CalendarDays, label: "Leave", module: "leave" },
  { to: "/payroll", icon: PhilippinePeso, label: "Payroll", module: "payroll" },
  { to: "/my-pay", icon: WalletCards, label: "My Pay", module: "my_pay" },
  { to: "/performance", icon: Target, label: "Performance", module: "performance" },
  { to: "/audit-logs", icon: ScrollText, label: "Audit Logs", module: "audit_logs" },
  { to: "/role-matrix", icon: KeyRound, label: "Role Access", module: "role_matrix" },
];

const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_EXPANDED = 240;

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const logoSrc = isDark ? "/favicon1/bluepeak-favicon.jpg" : "/favicon1/BLuepeak-favicon-lightmode.png";
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

  const handleMouseEnter = useCallback(() => setExpanded(true), []);
  const handleMouseLeave = useCallback(() => setExpanded(false), []);

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex flex-col h-screen glass-sidebar overflow-hidden shrink-0 z-20",
        "shadow-sm"
      )}
    >
      <div className="flex items-center gap-3 px-3 h-16 border-b border-sidebar-border shrink-0">
        <div className="h-10 w-10 rounded-xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={logoSrc}
            alt="BLUEPEAK"
            className="h-full w-full object-contain"
          />
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <span className="text-sidebar-primary font-bold text-lg tracking-tight whitespace-nowrap">
                BLUEPEAK
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto overflow-x-hidden">
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
              layout
            >
              <NavLink
                to={item.to}
                title={!expanded ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-out",
                  "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  !expanded && "justify-center px-0",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 shadow-sm transition-all duration-300"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {expanded && <span>{item.label}</span>}
                </span>
              </NavLink>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        {canAccessCreateUser && (
          <NavLink
            to="/admin/users/new"
            title={!expanded ? "Create User" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent",
              !expanded && "justify-center px-0"
            )}
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            {expanded && <span>Create User</span>}
          </NavLink>
        )}
        {canAccessCreateAdmin && (
          <NavLink
            to="/admin/create-admin"
            title={!expanded ? "Create Admin" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent",
              !expanded && "justify-center px-0"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {expanded && <span>Create Admin</span>}
          </NavLink>
        )}
        {canAccessSettings && (
          <NavLink
            to="/settings"
            title={!expanded ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent",
              !expanded && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {expanded && <span>Settings</span>}
          </NavLink>
        )}

        <button
          onClick={onLogout}
          title={!expanded ? "Logout" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full",
            !expanded && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {expanded && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
}
