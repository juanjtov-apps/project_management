import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyHeaderProps {
  title: string;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  "data-testid"?: string;
}

export function StickyHeader({
  title,
  count,
  isExpanded,
  onToggle,
  className,
  "data-testid": testId,
}: StickyHeaderProps) {
  return (
    <button
      onClick={onToggle}
      data-testid={testId}
      className={cn(
        "sticky-top tap-target w-full flex items-center justify-between",
        "px-4 py-3 bg-[var(--surface-muted)] border-b border-border",
        "hover:bg-[var(--surface-muted)]/80 transition-colors",
        "focus-visible-ring",
        className
      )}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
    >
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {typeof count === "number" && (
          <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-[var(--text-secondary)]">
            {count}
          </span>
        )}
      </div>
      
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
      )}
    </button>
  );
}
