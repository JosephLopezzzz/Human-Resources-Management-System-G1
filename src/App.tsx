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
import { Suspense, lazy } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const Departments = lazy(() => import("./pages/Departments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Leave = lazy(() => import("./pages/Leave"));
const Payroll = lazy(() => import("./pages/Payroll"));
const MyPay = lazy(() => import("./pages/MyPay"));
const Reports = lazy(() => import("./pages/Reports"));
const Performance = lazy(() => import("./pages/Performance"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const RoleMatrix = lazy(() => import("./pages/RoleMatrix"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminCreateUser = lazy(() => import("./pages/AdminCreateUser"));
const AdminCreateAdmin = lazy(() => import("./pages/AdminCreateAdmin"));

const PageLoader = () => (
  <div className="flex bg-background h-screen w-screen flex-col items-center justify-center p-8 space-y-4">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
    <p className="text-sm text-muted-foreground font-medium animate-pulse tracking-wide">INITIALIZING WORKSPACE...</p>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
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
                    <Route element={<RequireRole allowed={ROUTE_ROLES["/role-matrix"]} />}>
                      <Route path="/role-matrix" element={<RoleMatrix />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
