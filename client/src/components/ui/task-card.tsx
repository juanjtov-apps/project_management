import { GripVertical, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/overflow-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { highlightText } from "@/lib/highlightText";

interface TaskCardProps {
  id: string;
  title: string;
  projectName?: string;
  location?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status: string;
  dueDate?: Date;
  isOverdue?: boolean;
  assignees?: Array<{ id: string; name: string; image?: string }>;
  onStatusChange?: (status: string) => void;
  menuItems?: OverflowMenuItem[];
  onSelect?: () => void;
  isSelected?: boolean;
  isDraggable?: boolean;
  searchTerm?: string;
  className?: string;
  "data-testid"?: string;
}

const priorityColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export function TaskCard({
  id,
  title,
  projectName,
  location,
  priority,
  status,
  dueDate,
  isOverdue,
  assignees = [],
  onStatusChange,
  menuItems,
  onSelect,
  isSelected,
  isDraggable,
  searchTerm = "",
  className,
  "data-testid": testId,
}: TaskCardProps) {
  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" },
  ];

  return (
    <div
      data-testid={testId}
      className={cn(
        "group relative flex items-center gap-4 p-4 bg-white border border-border rounded-lg",
        "hover:border-primary/50 hover:shadow-md transition-all",
        isSelected && "ring-2 ring-primary border-primary",
        className
      )}
    >
      {/* Left: Drag Handle & Selection */}
      <div className="flex items-center gap-2">
        {isDraggable && (
          <button
            className="p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        )}
        
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            data-testid={`task-checkbox-${id}`}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            aria-label={`Select ${title}`}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h4 className="font-semibold text-[var(--text-primary)] truncate mb-1">
          {searchTerm ? highlightText(title, searchTerm) : title}
        </h4>

        {/* Project & Location */}
        {(projectName || location) && (
          <p className="text-sm text-[var(--text-secondary)] truncate mb-2">
            {[projectName, location].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {priority && (
            <Badge
              variant="outline"
              className={cn("text-xs", priorityColors[priority])}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Badge>
          )}

          {assignees.length > 0 && (
            <AvatarGroup avatars={assignees} max={3} size="sm" />
          )}

          {dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue
                  ? "text-[var(--color-danger-600)] font-medium"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {isOverdue && <Clock className="w-3 h-3" />}
              {format(dueDate, "MMM d")}
            </span>
          )}
        </div>
      </div>

      {/* Right: Status & Menu */}
      <div className="flex items-center gap-2">
        {onStatusChange && (
          <SegmentedControl
            options={statusOptions}
            value={status}
            onChange={onStatusChange}
            className="hidden md:flex"
            data-testid={`task-status-control-${id}`}
          />
        )}

        {menuItems && menuItems.length > 0 && (
          <OverflowMenu items={menuItems} data-testid={`task-menu-${id}`} />
        )}
      </div>
    </div>
  );
}
