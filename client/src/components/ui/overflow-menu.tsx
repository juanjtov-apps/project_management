import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverflowMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  separator?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  triggerClassName?: string;
  "data-testid"?: string;
}

export function OverflowMenu({
  items,
  triggerClassName,
  "data-testid": testId,
}: OverflowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid={testId}
        className={cn(
          "tap-target inline-flex items-center justify-center rounded-lg",
          "hover:bg-[var(--surface-muted)] focus-visible-ring",
          "transition-colors",
          triggerClassName
        )}
        aria-label="More options"
      >
        <MoreVertical className="w-5 h-5 text-[var(--text-secondary)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => (
          <div key={index}>
            {item.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={item.onClick}
              data-testid={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "tap-target cursor-pointer",
                item.variant === "danger" &&
                  "text-[var(--color-danger-600)] focus:text-[var(--color-danger-600)]"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 mr-2" />}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
