import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Hammer,
  Bath,
  Home,
  PlusSquare,
  Building2,
  Layers,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StageTemplateItem {
  id: string;
  templateId: string;
  orderIndex: number;
  name: string;
  defaultDurationDays?: number;
  defaultMaterialsNote?: string;
}

interface StageTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  items: StageTemplateItem[];
  createdAt: string;
}

interface TemplateSelectorProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Template icons mapping
const templateIcons: Record<string, typeof Hammer> = {
  "Kitchen Remodel": Hammer,
  "Bathroom Renovation": Bath,
  "Full Home Remodel": Home,
  "Room Addition": PlusSquare,
  "ADU Construction": Building2,
  Custom: Layers,
};

// Template accent colors
const templateColors: Record<string, string> = {
  "Kitchen Remodel": "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  "Bathroom Renovation": "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  "Full Home Remodel": "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  "Room Addition": "from-green-500/20 to-green-600/5 border-green-500/30",
  "ADU Construction": "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  Custom: "from-zinc-500/20 to-zinc-600/5 border-zinc-500/30",
};

const templateIconColors: Record<string, string> = {
  "Kitchen Remodel": "text-orange-400",
  "Bathroom Renovation": "text-cyan-400",
  "Full Home Remodel": "text-purple-400",
  "Room Addition": "text-green-400",
  "ADU Construction": "text-blue-400",
  Custom: "text-zinc-400",
};

export function TemplateSelector({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<StageTemplate | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<StageTemplate[]>({
    queryKey: ["/api/v1/stages/templates"],
    enabled: open,
  });

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: async ({
      templateId,
      startDate,
    }: {
      templateId: string;
      startDate?: string;
    }) => {
      return apiRequest(`/api/v1/stages/apply-template`, {
        method: "POST",
        body: {
          templateId,
          projectId,
          startDate: startDate || null,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Template applied!",
        description: `Created ${selectedTemplate?.items.length || 0} stages for your project.`,
      });
      onOpenChange(false);
      setSelectedTemplate(null);
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to apply template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApply = () => {
    if (!selectedTemplate) return;
    applyMutation.mutate({
      templateId: selectedTemplate.id,
      startDate,
    });
  };

  const calculateTotalDays = (items: StageTemplateItem[]) => {
    return items.reduce((sum, item) => sum + (item.defaultDurationDays || 7), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="bg-zinc-900 border-zinc-700 w-[calc(100vw-2rem)] sm:w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4 sm:mx-auto">
        {/* Apple HIG pattern: Close (left) → Icon → Title → Actions (right) */}
        <DialogHeader className="flex flex-row items-center gap-3">
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex-shrink-0 touch-manipulation"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg sm:text-xl text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="truncate">Choose a Template</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Select a template to set up your project stages.
            </DialogDescription>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : !selectedTemplate ? (
          /* Template Grid */
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4">
              {templates
                .filter((t) => t.name !== "Custom")
                .map((template) => {
                  const Icon = templateIcons[template.name] || Layers;
                  const colorClass =
                    templateColors[template.name] || templateColors["Custom"];
                  const iconColor =
                    templateIconColors[template.name] ||
                    templateIconColors["Custom"];
                  const totalDays = calculateTotalDays(template.items);

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`relative p-5 rounded-xl border bg-gradient-to-br ${colorClass} text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 group`}
                    >
                      {/* Background Pattern */}
                      <div
                        className="absolute inset-0 opacity-5 rounded-xl"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className={`p-2.5 rounded-lg bg-zinc-900/50 ${iconColor}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
                        </div>

                        <h3 className="font-semibold text-white mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                          {template.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {template.items.length} stages
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />~{totalDays} days
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Template Preview */
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            <div className="py-4 space-y-4">
              {/* Template Header */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon =
                      templateIcons[selectedTemplate.name] || Layers;
                    const iconColor =
                      templateIconColors[selectedTemplate.name] ||
                      templateIconColors["Custom"];
                    return (
                      <div className={`p-2 rounded-lg bg-zinc-900 ${iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {selectedTemplate.items.length} stages &middot; ~
                      {calculateTotalDays(selectedTemplate.items)} days total
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  Change
                </Button>
              </div>

              {/* Start Date Picker */}
              <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                <Label className="text-zinc-300 mb-2 block text-sm">
                  Project Start Date
                </Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white w-full sm:max-w-[200px]"
                    />
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-500">
                    Stage dates will be calculated from this date
                  </span>
                </div>
              </div>

              {/* Stages Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-zinc-300 mb-3">
                  Stages that will be created:
                </h4>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-zinc-700" />

                  <div className="space-y-2">
                    {selectedTemplate.items
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((item, index) => (
                        <div key={item.id} className="relative pl-10">
                          {/* Timeline Dot */}
                          <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-amber-500/50 border-2 border-zinc-900" />

                          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  #{index + 1}
                                </span>
                                <span className="font-medium text-white">
                                  {item.name}
                                </span>
                              </div>
                              {item.defaultDurationDays && (
                                <Badge
                                  variant="outline"
                                  className="text-zinc-400 border-zinc-600"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.defaultDurationDays} days
                                </Badge>
                              )}
                            </div>
                            {item.defaultMaterialsNote && (
                              <p className="mt-2 text-sm text-zinc-500 flex items-start gap-2">
                                <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                {item.defaultMaterialsNote}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {selectedTemplate && (
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => setSelectedTemplate(null)}
              className="text-zinc-400 hover:text-white"
            >
              Back
            </Button>
            <Button
              onClick={handleApply}
              disabled={applyMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {applyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Template
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
