import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomActionBarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
}

interface BottomActionBarProps {
  selectedCount: number;
  actions: BottomActionBarAction[];
  onClear: () => void;
  className?: string;
  "data-testid"?: string;
}

export function BottomActionBar({
  selectedCount,
  actions,
  onClear,
  className,
  "data-testid": testId,
}: BottomActionBarProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white border-t border-border shadow-lg",
        "animate-slide-up",
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              data-testid="clear-selection-button"
              className="tap-target p-2 rounded-lg hover:bg-[var(--surface-muted)] focus-visible-ring"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || "default"}
                size="sm"
                data-testid={`bulk-action-${index}`}
                className="tap-target"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
