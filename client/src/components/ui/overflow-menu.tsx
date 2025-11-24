import { useState, useEffect } from "react";
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
  const [open, setOpen] = useState(false);

  // Prevent dropdown from opening when a dialog is closing
  useEffect(() => {
    const handleDialogClose = () => {
      // Close dropdown if it's open when dialog closes
      if (open) {
        setOpen(false);
      }
      // Block opening for a short period after dialog closes
      const blockUntil = Date.now() + 200; // 200ms block period
      const checkBlock = () => {
        if (Date.now() < blockUntil) {
          setOpen(false);
          requestAnimationFrame(checkBlock);
        }
      };
      requestAnimationFrame(checkBlock);
    };

    window.addEventListener('dialog:close', handleDialogClose);
    return () => {
      window.removeEventListener('dialog:close', handleDialogClose);
    };
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={(newOpen) => {
      // Prevent opening if a dialog was just closed (within 200ms)
      const timeSinceLastDialogClose = (window as any).__lastDialogCloseTime || 0;
      const timeSinceClose = Date.now() - timeSinceLastDialogClose;
      
      if (newOpen && timeSinceClose < 200) {
        // Block opening if dialog was just closed
        return;
      }
      
      setOpen(newOpen);
    }}>
      <DropdownMenuTrigger
        data-testid={testId}
        className={cn(
          "tap-target inline-flex items-center justify-center rounded-lg",
          "hover:bg-[var(--surface-muted)] focus-visible-ring",
          "transition-colors",
          triggerClassName
        )}
        aria-label="More options"
        onClick={(e) => {
          // Prevent opening if clicking right after dialog close
          const timeSinceLastDialogClose = (window as any).__lastDialogCloseTime || 0;
          const timeSinceClose = Date.now() - timeSinceLastDialogClose;
          
          if (timeSinceClose < 200) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }}
      >
        <MoreVertical className="w-5 h-5 text-[var(--text-secondary)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => (
          <div key={index}>
            {item.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
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
