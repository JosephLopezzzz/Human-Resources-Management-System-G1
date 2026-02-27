import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "pending" | "approved" | "rejected" | "probation" | "terminated" | "suspended" | "resigned" | "regular" | "locked" | "draft";

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/10 text-success border-success/20",
  regular: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-muted",
  pending: "bg-warning/10 text-warning border-warning/20",
  probation: "bg-warning/10 text-warning border-warning/20",
  draft: "bg-warning/10 text-warning border-warning/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  resigned: "bg-muted text-muted-foreground border-muted",
  locked: "bg-destructive/10 text-destructive border-destructive/20",
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", statusStyles[status])}>
      {label || status}
    </Badge>
  );
}
