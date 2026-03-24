import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObfuscatedValueProps {
  children: React.ReactNode;
  mask?: string;
  className?: string;
  buttonClassName?: string;
}

export function ObfuscatedValue({
  children,
  mask = "••••••••",
  className,
  buttonClassName,
}: ObfuscatedValueProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("font-medium transition-all duration-200", !isRevealed && "tracking-widest opacity-70")}>
        {isRevealed ? children : mask}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsRevealed(!isRevealed);
        }}
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
