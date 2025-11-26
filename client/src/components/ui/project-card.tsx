import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  title: string;
  status: string;
  location?: string;
  progress: number;
  thumbnailUrl?: string;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  "data-testid"?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: {
    label: "Active",
    color: "#4ADE80",
  },
  on_hold: {
    label: "On Hold",
    color: "#EAB308",
  },
  "on-hold": {
    label: "On Hold",
    color: "#EAB308",
  },
  completed: {
    label: "Completed",
    color: "#60A5FA",
  },
  delayed: {
    label: "Delayed",
    color: "#EF4444",
  },
};

const defaultStatus = { label: "In Progress", color: "#4ADE80" };

export function ProjectCard({
  id,
  title,
  status,
  location,
  progress,
  thumbnailUrl,
  onClick,
  isSelected,
  className,
  "data-testid": testId,
}: ProjectCardProps) {
  const normalizedStatus = status?.toLowerCase().replace(/[\s]+/g, "_") || "active";
  const statusInfo = statusConfig[normalizedStatus] || statusConfig[status] || defaultStatus;

  return (
    <div
      data-testid={testId}
      className={cn(
        "group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
        "hover:ring-2 hover:ring-[#4ADE80]/50",
        isSelected && "ring-2 ring-[#4ADE80]",
        className
      )}
      onClick={onClick}
    >
      {/* Thumbnail Image - 16:9 aspect ratio for better desktop proportions */}
      <div className="aspect-video relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1F242C] to-[#161B22] flex items-center justify-center">
            <Building2 className="w-10 h-10 text-[#2D333B]" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-medium text-white text-sm truncate">
            {title}
          </h3>
          <p className="text-xs text-white/60 truncate">
            {location || statusInfo.label}
          </p>
        </div>
      </div>
    </div>
  );
}
