import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/overflow-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ProjectCardProps {
  id: string;
  title: string;
  status: "active" | "on_hold" | "completed";
  location?: string;
  progress: number;
  taskCount: number;
  lastUpdated?: Date;
  members?: Array<{ id: string; name: string; image?: string }>;
  menuItems?: OverflowMenuItem[];
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-[#166534]/20 text-[#4ADE80] border-[#166534]/30",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-[#854D0E]/20 text-[#EAB308] border-[#854D0E]/30",
  },
  completed: {
    label: "Completed",
    className: "bg-[#1E40AF]/20 text-[#60A5FA] border-[#1E40AF]/30",
  },
};

export function ProjectCard({
  id,
  title,
  status,
  location,
  progress,
  taskCount,
  lastUpdated,
  members = [],
  menuItems,
  onClick,
  className,
  "data-testid": testId,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-xl p-5 bg-[#161B22] group relative transition-all",
        "border border-[#2D333B] hover:border-[#4ADE80]/50 hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-lg text-[var(--text-primary)] truncate mb-1"
            title={title}
          >
            {title}
          </h3>
          {location && (
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {location}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
          
          {menuItems && menuItems.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <OverflowMenu items={menuItems} data-testid={`project-menu-${id}`} />
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Progress</span>
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {progress}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-secondary)]">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
          
          {lastUpdated && (
            <span className="text-xs text-[var(--text-secondary)]">
              Updated {format(lastUpdated, "MMM d")}
            </span>
          )}
        </div>

        {members.length > 0 && (
          <AvatarGroup avatars={members} max={4} size="sm" />
        )}
      </div>
    </div>
  );
}
