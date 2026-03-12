import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  /** Optional percentage (0–100) to show a tiny progress bar */
  progress?: number;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, progress }: StatCardProps) {
  const clampedProgress =
    typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <div className="stat-card-gradient rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p
          className={cn(
            "text-xs mt-1 font-medium",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
      {clampedProgress !== null && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              changeType === "positive" && "bg-success",
              changeType === "negative" && "bg-destructive",
              changeType === "neutral" && "bg-primary"
            )}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
