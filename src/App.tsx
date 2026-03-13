import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireRole } from "@/auth/RequireRole";
import { ROUTE_ROLES } from "@/auth/roles";
import { InactivityLogout } from "@/auth/InactivityLogout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import MyPay from "./pages/MyPay";
import Reports from "./pages/Reports";
import Performance from "./pages/Performance";
import AuditLogs from "./pages/AuditLogs";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Mfa from "./pages/Mfa";
import ResetPassword from "./pages/ResetPassword";
import AdminCreateUser from "./pages/AdminCreateUser";
import AdminCreateAdmin from "./pages/AdminCreateAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <InactivityLogout />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/mfa" element={<Mfa />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route element={<RequireRole allowed={ROUTE_ROLES["/admin/users/new"]} />}>
                  <Route path="/admin/users/new" element={<AdminCreateUser />} />
                </Route>
                <Route element={<RequireRole allowed={ROUTE_ROLES["/admin/create-admin"]} />}>
                  <Route path="/admin/create-admin" element={<AdminCreateAdmin />} />
                </Route>
                <Route path="/employees" element={<Employees />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/leave" element={<Leave />} />
                <Route element={<RequireRole allowed={ROUTE_ROLES["/payroll"]} />}>
                  <Route path="/payroll" element={<ErrorBoundary><Payroll /></ErrorBoundary>} />
                </Route>
                <Route path="/my-pay" element={<MyPay />} />
                <Route path="/performance" element={<Performance />} />
                <Route element={<RequireRole allowed={ROUTE_ROLES["/audit-logs"]} />}>
                  <Route path="/audit-logs" element={<ErrorBoundary><AuditLogs /></ErrorBoundary>} />
                </Route>
                <Route element={<RequireRole allowed={ROUTE_ROLES["/settings"]} />}>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
