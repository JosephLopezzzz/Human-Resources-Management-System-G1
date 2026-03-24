import { Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useAuth } from "@/auth/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { formatDistanceToNow } from "date-fns";
import { ThemeToggle } from "./ThemeToggle";

export function AppTopbar() {
  const { user } = useAuth();
  const { data: notifications = [] } = useAuditLogs("", "all");
  const email = user?.email ?? "—";
  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "User";
  const initials = (name || email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="h-14 glass-topbar flex items-center justify-between gap-4 px-6 shrink-0 transition-all duration-300">
      <div className="flex-1 max-w-xl flex items-center">
        <div className="relative flex flex-1 items-center rounded-xl border border-input bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all overflow-hidden">
          <Input
            placeholder="Search employees, departments, payroll..."
            className="h-9 border-0 bg-transparent pl-4 pr-12 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0 pr-2">
        <ThemeToggle />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative p-2.5 rounded-xl hover:bg-muted transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {notifications.length > 0 && (
                <Badge className="absolute top-1 right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] rounded-full bg-destructive text-destructive-foreground border-0">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Notifications</p>
              <Link
                to="/audit-logs"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.slice(0, 6).map((log) => (
                  <li key={log.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {log.actor_email ?? "system"} •{" "}
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
