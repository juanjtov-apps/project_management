import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Building2, MapPin, MoreVertical, ArrowRight, Layers, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  id: string;
  title: string;
  status: string;
  location?: string;
  progress: number;
  dueDate?: string | Date | null;
  thumbnailUrl?: string;
  photoUrls?: string[];
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStages?: () => void;
  onIssues?: () => void;
  isSelected?: boolean;
  className?: string;
  "data-testid"?: string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  active: {
    label: "Active",
    bgColor: "bg-[#4ADE80]",
    textColor: "text-black",
  },
  on_hold: {
    label: "On Hold",
    bgColor: "bg-[#EAB308]",
    textColor: "text-black",
  },
  "on-hold": {
    label: "On Hold",
    bgColor: "bg-[#EAB308]",
    textColor: "text-black",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-[#60A5FA]",
    textColor: "text-black",
  },
  delayed: {
    label: "Delayed",
    bgColor: "bg-[#F97316]",
    textColor: "text-black",
  },
};

const defaultStatus = { label: "Active", bgColor: "bg-[#4ADE80]", textColor: "text-black" };

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function ProjectCard({
  id,
  title,
  status,
  location,
  progress,
  dueDate,
  thumbnailUrl,
  photoUrls = [],
  onClick,
  onEdit,
  onDelete,
  onStages,
  onIssues,
  isSelected,
  className,
  "data-testid": testId,
}: ProjectCardProps) {
  const normalizedStatus = status?.toLowerCase().replace(/[\s]+/g, "_") || "active";
  const statusInfo = statusConfig[normalizedStatus] || statusConfig[status] || defaultStatus;
  const formattedDueDate = formatDate(dueDate);

  // Controlled dropdown state with guard to prevent focus-triggered reopening
  const [menuOpen, setMenuOpen] = useState(false);
  const isProcessingAction = useRef(false);
  const lastActionTime = useRef(0);

  const handleOpenChange = useCallback((open: boolean) => {
    // Block reopening for 300ms after an action was triggered
    const timeSinceAction = Date.now() - lastActionTime.current;
    if (open && timeSinceAction < 300) {
      return;
    }
    
    // Block if we're currently processing an action
    if (isProcessingAction.current) {
      return;
    }
    
    setMenuOpen(open);
  }, []);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Set guard flags
    isProcessingAction.current = true;
    lastActionTime.current = Date.now();
    
    // Close menu first
    setMenuOpen(false);
    
    // Execute callback after menu closes
    setTimeout(() => {
      if (onEdit) {
        onEdit();
      }
      // Release guard after a delay to prevent focus-triggered reopen
      setTimeout(() => {
        isProcessingAction.current = false;
      }, 300);
    }, 10);
  }, [onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Set guard flags
    isProcessingAction.current = true;
    lastActionTime.current = Date.now();
    
    // Close menu first
    setMenuOpen(false);
    
    // Execute callback after menu closes
    setTimeout(() => {
      if (onDelete) {
        onDelete();
      }
      // Release guard after a delay to prevent focus-triggered reopen
      setTimeout(() => {
        isProcessingAction.current = false;
      }, 300);
    }, 10);
  }, [onDelete]);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Block if we recently performed an action
    const timeSinceAction = Date.now() - lastActionTime.current;
    if (timeSinceAction < 300) {
      e.preventDefault();
      return;
    }
  }, []);

  return (
    <div
      data-testid={testId}
      className={cn(
        "group relative rounded-xl overflow-hidden bg-[#1A1F26] border border-[#2D333B] transition-all duration-200",
        "hover:border-[#4ADE80]/50 hover:shadow-lg",
        isSelected && "ring-2 ring-[#4ADE80] border-[#4ADE80]",
        className
      )}
    >
      {/* Cover Photo Section */}
      <div className="relative h-32 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1F242C] to-[#161B22] flex items-center justify-center">
            <Building2 className="w-12 h-12 text-[#2D333B]" />
          </div>
        )}
        
        {/* 3-dot Menu - Controlled with guard */}
        <div className="absolute top-2 right-2">
          <DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-black/40 hover:bg-black/60 text-white touch-manipulation"
                onClick={handleTriggerClick}
                data-testid={`button-menu-${id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1A1F26] border-[#2D333B]">
              {onEdit && (
                <DropdownMenuItem
                  onClick={handleEdit}
                  data-testid={`menu-edit-${id}`}
                >
                  Edit Project
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-400"
                  data-testid={`menu-delete-${id}`}
                >
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Title and Location */}
        <div>
          <h3 className="font-semibold text-white text-base truncate">
            {title}
          </h3>
          {location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-[#8B949E]" />
              <span className="text-xs text-[#8B949E] truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Status Badge and Due Date */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              statusInfo.bgColor,
              statusInfo.textColor
            )}
          >
            {statusInfo.label}
          </span>
          {formattedDueDate && (
            <span className="text-xs text-[#8B949E]">
              Due {formattedDueDate}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8B949E]">Progress</span>
            <span className="text-xs text-[#4ADE80] font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-[#2D333B]" />
        </div>

        {/* Photo Thumbnails and Actions */}
        <div className="flex items-center justify-between pt-1">
          {/* Photo Thumbnails */}
          <div className="flex -space-x-2">
            {photoUrls.slice(0, 3).map((url, index) => (
              <div
                key={index}
                className="w-7 h-7 rounded-full border-2 border-[#1A1F26] overflow-hidden"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {photoUrls.length === 0 && (
              <div className="w-7 h-7 rounded-full border-2 border-[#1A1F26] bg-[#2D333B] flex items-center justify-center">
                <Building2 className="w-3 h-3 text-[#8B949E]" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stages Button */}
            {onStages && (
              <button
                onClick={(e) => { e.stopPropagation(); onStages(); }}
                className="flex items-center justify-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors p-2 -m-2 touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-0 sm:m-0"
                title="Manage Stages"
                data-testid={`button-stages-${id}`}
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

            {/* Issues Button */}
            {onIssues && (
              <button
                onClick={(e) => { e.stopPropagation(); onIssues(); }}
                className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors p-2 -m-2 touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-0 sm:m-0"
                title="Report Issue"
                data-testid={`button-issues-${id}`}
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            )}

            {/* View Details Link */}
            <button
              onClick={onClick}
              className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#4ADE80] transition-colors p-2 -m-2 touch-manipulation min-h-[44px] sm:min-h-0 sm:p-0 sm:m-0"
              data-testid={`link-view-details-${id}`}
            >
              View Details
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateProjectCard({
  onClick,
  className,
  "data-testid": testId,
}: {
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl overflow-hidden bg-[#1A1F26] border border-dashed border-[#2D333B] transition-all duration-200 cursor-pointer",
        "hover:border-[#4ADE80]/50 hover:bg-[#1A1F26]/80",
        "flex flex-col items-center justify-center min-h-[280px]",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#2D333B] flex items-center justify-center mb-3 group-hover:bg-[#4ADE80]/20 transition-colors">
        <span className="text-2xl text-[#8B949E] group-hover:text-[#4ADE80]">+</span>
      </div>
      <span className="text-sm text-[#8B949E] group-hover:text-white transition-colors">
        Create New Project
      </span>
    </div>
  );
}
