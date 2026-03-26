import { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudit, AuditCategory } from "@/hooks/useAudit";
import { useMasking } from "./MaskingContext";

interface ObfuscatedValueProps {
  children: React.ReactNode;
  mask?: string;
  className?: string;
  buttonClassName?: string;
  // Security Auditing
  auditLabel?: string;
  category?: AuditCategory;
  entityId?: string;
  entityType?: string;
}

export function ObfuscatedValue({
  children,
  mask = "••••••••",
  className,
  buttonClassName,
  auditLabel,
  category = "system",
  entityId,
  entityType = "PII_DATA",
}: ObfuscatedValueProps) {
  // Use a unique ID for this instance if none provided, memoized to stay stable during re-renders
  const id = useMemo(() => entityId || Math.random().toString(36).substr(2, 9), [entityId]);
  const { revealedId, setRevealedId } = useMasking();
  const isRevealed = revealedId === id;
  const { logEvent } = useAudit();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isRevealed;
    setRevealedId(nextState ? id : null);

    if (nextState && auditLabel) {
      logEvent(
        `REVEAL_SENSITIVE_DATA: ${auditLabel}`,
        category,
        entityType,
        id
      );
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("font-medium transition-all duration-200", !isRevealed && "tracking-widest opacity-70")}>
        {isRevealed ? children : mask}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground outline-none transition-colors",
          buttonClassName
        )}
        title={isRevealed ? "Hide sensitive data" : "Reveal sensitive data"}
      >
        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
