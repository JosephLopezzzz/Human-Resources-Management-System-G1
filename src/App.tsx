import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireRole } from "@/auth/RequireRole";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import Performance from "./pages/Performance";
import AuditLogs from "./pages/AuditLogs";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Mfa from "./pages/Mfa";
import AdminCreateUser from "./pages/AdminCreateUser";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/mfa" element={<Mfa />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route element={<RequireRole allowed={["admin"]} />}>
                  <Route path="/admin/users/new" element={<AdminCreateUser />} />
                </Route>
                <Route path="/employees" element={<Employees />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/leave" element={<Leave />} />
                <Route element={<RequireRole allowed={["admin", "hr", "payroll"]} />}>
                  <Route path="/payroll" element={<Payroll />} />
                </Route>
                <Route path="/performance" element={<Performance />} />
                <Route element={<RequireRole allowed={["admin", "hr", "security"]} />}>
                  <Route path="/audit-logs" element={<AuditLogs />} />
                </Route>
                <Route element={<RequireRole allowed={["admin", "hr"]} />}>
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
