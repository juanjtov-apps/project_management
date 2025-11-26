import { X, Sun, Cloud, CloudRain, Users, Building2, TrendingUp, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { AvatarGroup } from "@/components/ui/avatar-group";
import type { Project, Photo, User } from "@shared/schema";

interface ProjectQuickViewProps {
  project: Project | null;
  photos?: Photo[];
  members?: User[];
  onClose: () => void;
  isOpen: boolean;
  className?: string;
}

export function ProjectQuickView({
  project,
  photos = [],
  members = [],
  onClose,
  isOpen,
  className,
}: ProjectQuickViewProps) {
  // Early return if not open or no project - prevents null access errors
  if (!isOpen || !project) {
    return null;
  }

  const thumbnailUrl = photos.length > 0 
    ? `/api/photos/${photos[0].id}/file`
    : null;

  const recentPhotos = photos.slice(0, 4);
  
  const budgetSpent = 65;
  const totalBudget = 2000000;
  const spentAmount = (totalBudget * budgetSpent) / 100;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const memberAvatars = members.slice(0, 2).map((m) => ({
    id: m.id,
    name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Unknown',
    image: undefined,
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[400px] bg-[#161B22] border-l border-[#2D333B] z-50",
          "transform transition-transform duration-300 ease-out overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#161B22] border-b border-[#2D333B] p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">Quick View</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1F242C] transition-colors"
            data-testid="close-quick-view"
          >
            <X className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Project Thumbnail */}
          <div className="rounded-xl overflow-hidden aspect-video relative">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1F242C] to-[#0F1115] flex items-center justify-center">
                <Building2 className="w-16 h-16 text-[#2D333B]" />
              </div>
            )}
          </div>

          {/* Project Name & Progress */}
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
            <p className="text-sm text-[#9CA3AF] mb-3">Progress</p>
            <Progress value={project.progress || 0} className="h-2" />
            <p className="text-xs text-[#9CA3AF] mt-1 text-right">{project.progress || 0}%</p>
          </div>

          {/* Two Column Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Site Weather Card */}
            <div className="bg-[#1F242C] rounded-xl p-4">
              <p className="text-xs text-[#9CA3AF] mb-3">Site Weather</p>
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-8 h-8 text-[#EAB308]" />
              </div>
              <p className="text-2xl font-bold text-white">22°C</p>
              <p className="text-xs text-[#9CA3AF]">Clear skies</p>
            </div>

            {/* Financial Health Card */}
            <div className="bg-[#1F242C] rounded-xl p-4">
              <p className="text-xs text-[#9CA3AF] mb-3">Financial Health</p>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="#2D333B"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="6"
                    strokeDasharray={`${budgetSpent * 1.76} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{budgetSpent}%</span>
                </div>
              </div>
              <p className="text-xs text-[#9CA3AF] text-center">Spent</p>
              <p className="text-xs text-[#9CA3AF] text-center mt-1">
                {formatCurrency(spentAmount)} / {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>

          {/* Key Stakeholders */}
          <div className="bg-[#1F242C] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF] mb-3">Key Stakeholders</p>
            {memberAvatars.length > 0 ? (
              <div className="flex items-center gap-4">
                {memberAvatars.map((member) => (
                  <div key={member.id} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center ring-2 ring-[#4ADE80]/30">
                      <span className="text-white font-semibold text-sm">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <p className="text-xs text-white mt-2">{member.name.split(' ')[0]} {member.name.split(' ')[1]?.[0]}.</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Users className="w-5 h-5" />
                <span className="text-sm">No team members assigned</span>
              </div>
            )}
          </div>

          {/* Recent Photos */}
          <div className="bg-[#1F242C] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF] mb-3">Recent Photos</p>
            {recentPhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {recentPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden"
                  >
                    <img
                      src={`/api/photos/${photo.id}/file`}
                      alt={photo.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Camera className="w-5 h-5" />
                <span className="text-sm">No photos yet</span>
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-[#1F242C] rounded-xl p-4 space-y-3">
            <p className="text-xs text-[#9CA3AF]">Project Details</p>
            
            {project.location && (
              <div>
                <p className="text-xs text-[#9CA3AF]">Location</p>
                <p className="text-sm text-white">{project.location}</p>
              </div>
            )}
            
            {project.description && (
              <div>
                <p className="text-xs text-[#9CA3AF]">Description</p>
                <p className="text-sm text-white line-clamp-3">{project.description}</p>
              </div>
            )}
            
            <div>
              <p className="text-xs text-[#9CA3AF]">Status</p>
              <p className="text-sm text-[#4ADE80] capitalize">{project.status?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
