import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, Sun, Cloud, CloudRain, Users, Building2, TrendingUp, Camera, Layers, ChevronRight, Clock, Sparkles, Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { StagesTab } from "@/components/stages/stages-tab";
import type { Project, Photo, User } from "@shared/schema";

interface ProjectStage {
  id: string;
  projectId: string;
  orderIndex: number;
  name: string;
  status: "NOT_STARTED" | "ACTIVE" | "COMPLETE";
  finishMaterialsDueDate?: string;
  clientVisible: boolean;
}

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
  const { t } = useTranslation('common');
  const [stagesOpen, setStagesOpen] = useState(false);

  // Fetch stages for the project
  const { data: stages = [] } = useQuery<ProjectStage[]>({
    queryKey: [`/api/v1/stages?projectId=${project?.id}`],
    enabled: isOpen && !!project?.id,
  });

  // Early return if not open or no project - prevents null access errors
  if (!isOpen || !project) {
    return null;
  }

  // Calculate stages summary
  const completedStages = stages.filter((s) => s.status === "COMPLETE").length;
  const activeStage = stages.find((s) => s.status === "ACTIVE");
  const nextMaterialsDue = stages
    .filter((s) => s.finishMaterialsDueDate && s.status !== "COMPLETE")
    .sort((a, b) => new Date(a.finishMaterialsDueDate!).getTime() - new Date(b.finishMaterialsDueDate!).getTime())[0];

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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

      {/* Side Panel - Full width on mobile, 400px on desktop */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[#161B22] border-l border-[#2D333B] z-50",
          "transform transition-transform duration-300 ease-out overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#161B22] border-b border-[#2D333B] p-3 sm:p-4 flex items-center justify-between z-10">
          <h2 className="text-base sm:text-lg font-semibold text-white">{t('quickView.title')}</h2>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 rounded-lg hover:bg-[#1F242C] transition-colors touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
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
            <p className="text-sm text-[#9CA3AF] mb-3">{t('quickView.progress')}</p>
            <Progress value={project.progress || 0} className="h-2" />
            <p className="text-xs text-[#9CA3AF] mt-1 text-right">{project.progress || 0}%</p>
          </div>

          {/* Two Column Cards - Stack on very small screens */}
          <div className="grid grid-cols-2 gap-3">
            {/* Site Weather Card */}
            <div className="bg-[#1F242C] rounded-xl p-4">
              <p className="text-xs text-[#9CA3AF] mb-3">{t('quickView.siteWeather')}</p>
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-8 h-8 text-[#EAB308]" />
              </div>
              <p className="text-2xl font-bold text-white">22°C</p>
              <p className="text-xs text-[#9CA3AF]">{t('quickView.clearSkies')}</p>
            </div>

            {/* Financial Health Card */}
            <div className="bg-[#1F242C] rounded-xl p-4">
              <p className="text-xs text-[#9CA3AF] mb-3">{t('quickView.financialHealth')}</p>
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
              <p className="text-xs text-[#9CA3AF] text-center">{t('quickView.spent')}</p>
              <p className="text-xs text-[#9CA3AF] text-center mt-1">
                {formatCurrency(spentAmount)} / {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>

          {/* Key Stakeholders */}
          <div className="bg-[#1F242C] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF] mb-3">{t('quickView.keyStakeholders')}</p>
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
                <span className="text-sm">{t('quickView.noTeamMembers')}</span>
              </div>
            )}
          </div>

          {/* Recent Photos */}
          <div className="bg-[#1F242C] rounded-xl p-4">
            <p className="text-xs text-[#9CA3AF] mb-3">{t('quickView.recentPhotos')}</p>
            {recentPhotos.length > 0 ? (
              <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
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
                <span className="text-sm">{t('quickView.noPhotos')}</span>
              </div>
            )}
          </div>

          {/* Project Stages */}
          <div className="bg-[#1F242C] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-[#9CA3AF]">{t('quickView.projectStages')}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={() => setStagesOpen(true)}
              >
                {t('quickView.manage')}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {stages.length > 0 ? (
              <div className="space-y-3">
                {/* Progress Summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9CA3AF]">{t('quickView.progress')}</span>
                  <span className="text-white font-medium">
                    {t('quickView.stagesComplete', { completed: completedStages, total: stages.length })}
                  </span>
                </div>

                {/* Active Stage */}
                {activeStage && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-400">{t('quickView.currentlyActive')}</p>
                      <p className="text-sm text-white truncate">{activeStage.name}</p>
                    </div>
                  </div>
                )}

                {/* Next Materials Due */}
                {nextMaterialsDue?.finishMaterialsDueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-rose-400" />
                    <span className="text-[#9CA3AF]">{t('quickView.materialsDue')}</span>
                    <span className="text-rose-400">
                      {formatDateShort(nextMaterialsDue.finishMaterialsDueDate)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-[#9CA3AF]">{t('quickView.noStages')}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => setStagesOpen(true)}
                >
                  {t('quickView.addStages')}
                </Button>
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-[#1F242C] rounded-xl p-4 space-y-3">
            <p className="text-xs text-[#9CA3AF]">{t('quickView.projectDetails')}</p>
            
            {project.location && (
              <div>
                <p className="text-xs text-[#9CA3AF]">{t('quickView.location')}</p>
                <p className="text-sm text-white">{project.location}</p>
              </div>
            )}
            
            {project.description && (
              <div>
                <p className="text-xs text-[#9CA3AF]">{t('quickView.description')}</p>
                <p className="text-sm text-white line-clamp-3">{project.description}</p>
              </div>
            )}
            
            <div>
              <p className="text-xs text-[#9CA3AF]">{t('quickView.status')}</p>
              <p className="text-sm text-[#4ADE80] capitalize">{project.status?.replace('_', ' ')}</p>
            </div>

            {/* Custom Fields */}
            {(() => {
              const cf = project.customFields as Record<string, string> | null | undefined;
              if (!cf || typeof cf !== 'object') return null;
              const entries = Object.entries(cf);
              if (entries.length === 0) return null;
              return entries.map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-[#9CA3AF]">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-sm text-white">{String(value)}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Stages Management Dialog */}
      <Dialog open={stagesOpen} onOpenChange={setStagesOpen}>
        <DialogContent hideCloseButton className="max-w-4xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700 p-0">
          {/* sr-only header for accessibility - close button is inside StagesTab */}
          <DialogHeader className="sr-only">
            <DialogTitle>{t('quickView.projectStages')}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <StagesTab
              projectId={project.id}
              onClose={() => setStagesOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
