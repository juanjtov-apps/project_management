import { GripVertical, Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/overflow-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { highlightText } from "@/lib/highlightText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  variant?: "row" | "canvas";
  "data-testid"?: string;
}

const priorityColors = {
  low: "bg-[#166534]/20 text-[#4ADE80] border-[#166534]/30",
  medium: "bg-[#854D0E]/20 text-[#EAB308] border-[#854D0E]/30",
  high: "bg-[#9A3412]/20 text-[#F97316] border-[#9A3412]/30",
  critical: "bg-[#991B1B]/20 text-[#EF4444] border-[#991B1B]/30",
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
  variant = "row",
  "data-testid": testId,
}: TaskCardProps) {
  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  const statusLabels: Record<string, string> = {
    "pending": "Pending",
    "in-progress": "In Progress",
    "completed": "Completed",
  };

  // Canvas variant - vertical card layout for grid displays
  if (variant === "canvas") {
    return (
      <div
        data-testid={testId}
        className={cn(
          "flex flex-col p-4 bg-[#161B22] border border-[#2D333B] rounded-lg h-full",
          "hover:border-[#4ADE80]/50 hover:shadow-lg transition-all",
          isSelected && "ring-2 ring-[#4ADE80] border-[#4ADE80]",
          className
        )}
      >
        {/* Header: Checkbox + Menu */}
        <div className="flex items-center justify-between mb-3">
          {onSelect ? (
            <label className="tap-target cursor-pointer" aria-label={`Select ${title}`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                data-testid={`task-checkbox-${id}`}
                className="w-5 h-5 rounded border-[#2D333B] bg-[#1F242C] text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
              />
            </label>
          ) : (
            <div />
          )}
          {menuItems && menuItems.length > 0 && (
            <OverflowMenu items={menuItems} data-testid={`task-menu-${id}`} />
          )}
        </div>

        {/* Title - allow wrapping, max 2 lines */}
        <h4 className="font-semibold text-[var(--text-primary)] mb-1 line-clamp-2 leading-tight">
          {searchTerm ? highlightText(title, searchTerm) : title}
        </h4>

        {/* Project & Location */}
        {(projectName || location) && (
          <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mb-3">
            {[projectName, location].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Meta: Priority + Due Date */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {priority && (
            <Badge
              variant="outline"
              className={cn("text-xs", priorityColors[priority])}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Badge>
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

        {/* Assignees */}
        {assignees.length > 0 && (
          <div className="mb-3">
            <AvatarGroup avatars={assignees} max={3} size="sm" />
          </div>
        )}

        {/* Footer: Compact Status Dropdown */}
        {onStatusChange && (
          <div className="mt-auto pt-3 border-t border-[#2D333B]">
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger
                className="w-full h-8 bg-[#1F242C] border-[#2D333B] text-sm"
                data-testid={`task-status-select-${id}`}
              >
                <SelectValue placeholder="Status">
                  {statusLabels[status] || status}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  }

  // Default row variant
  return (
    <div
      data-testid={testId}
      className={cn(
        "group relative flex items-center gap-4 p-4 bg-[#161B22] border border-[#2D333B] rounded-lg",
        "hover:border-[#4ADE80]/50 hover:shadow-lg transition-all",
        isSelected && "ring-2 ring-[#4ADE80] border-[#4ADE80]",
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
          <label className="tap-target cursor-pointer" aria-label={`Select ${title}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              data-testid={`task-checkbox-${id}`}
              className="w-5 h-5 rounded border-[#2D333B] bg-[#1F242C] text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
            />
          </label>
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
