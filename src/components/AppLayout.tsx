import { Outlet, Link } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { useAuth } from "@/auth/useAuth";

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <Outlet />
        </main>
        <footer className="border-t px-6 py-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} HR Management System</span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:inline">
                  Logged in as <span className="font-medium text-foreground">{user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="underline-offset-2 hover:underline text-xs font-medium"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="underline-offset-2 hover:underline text-xs font-medium"
              >
                Log in
              </Link>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
