import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectHealthCardProps {
  projectName: string;
  location?: string;
  progress: number;
  status: "active" | "on-hold" | "completed" | "planning";
  healthIcon: LucideIcon;
  healthLabel: string;
  healthColor: string;
  dueDate?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

const statusStyles = {
  active: "bg-green-50 text-green-700 border-green-200",
  "on-hold": "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  planning: "bg-slate-50 text-slate-700 border-slate-200",
};

export function ProjectHealthCard({
  projectName,
  location,
  progress,
  status,
  healthIcon: HealthIcon,
  healthLabel,
  healthColor,
  dueDate,
  onClick,
  "data-testid": testId,
}: ProjectHealthCardProps) {
  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200 text-left"
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId || `project-health-card-${projectName.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <h4 
            className="font-semibold text-base text-slate-900 truncate" 
            title={projectName}
          >
            {projectName}</h4>
          {location && (
            <p className="text-sm text-slate-500 truncate" title={location}>{location}</p>
          )}
        </div>
        <Badge 
          className={`ml-auto flex-shrink-0 ${statusStyles[status]}`}
          data-testid={`status-badge-${status}`}
        >
          {status}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-teal-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm pt-1">
        <div className="flex items-center gap-2">
          <HealthIcon size={16} style={{ color: healthColor }} aria-hidden="true" />
          <span style={{ color: healthColor }}>{healthLabel}</span>
        </div>
        {dueDate && (
          <span className="text-slate-500 text-xs">{dueDate}</span>
        )}
      </div>
    </Component>
  );
}
