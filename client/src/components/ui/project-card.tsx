import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  title: string;
  status: "active" | "on_hold" | "completed";
  location?: string;
  progress: number;
  thumbnailUrl?: string;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  "data-testid"?: string;
}

const statusConfig = {
  active: {
    label: "In Progress",
    color: "#4ADE80",
  },
  on_hold: {
    label: "On Hold",
    color: "#EAB308",
  },
  completed: {
    label: "Completed",
    color: "#60A5FA",
  },
};

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
  const statusInfo = statusConfig[status];

  return (
    <div
      data-testid={testId}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-2xl",
        isSelected && "ring-2 ring-[#4ADE80] ring-offset-2 ring-offset-[#0F1115]",
        className
      )}
      onClick={onClick}
    >
      {/* Thumbnail Image */}
      <div className="aspect-[4/3] relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1F242C] to-[#161B22] flex items-center justify-center">
            <Building2 className="w-16 h-16 text-[#2D333B]" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Progress Badge - Top Right */}
        <div 
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: statusInfo.color 
          }}
        >
          {progress}%
        </div>
        
        {/* Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg mb-1 truncate">
            {title}
          </h3>
          <p className="text-sm text-white/70 truncate">
            {statusInfo.label}
          </p>
        </div>
      </div>
    </div>
  );
}
