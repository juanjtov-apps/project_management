import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  id: string;
  description: string;
  itemType: "standard" | "doc_required" | "inspection";
  isCompleted: boolean;
}

interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

interface TaskWithChecklists {
  id: string;
  checklists?: Checklist[];
}

const itemTypeBadgeClass: Record<string, string> = {
  standard: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  doc_required: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  inspection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const itemTypeLabels: Record<string, string> = {
  standard: "Std",
  doc_required: "Doc",
  inspection: "Insp",
};

export function TaskChecklistPreview({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useQuery<TaskWithChecklists>({
    queryKey: ["/api/v1/sub/tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sub/tasks/${taskId}`, {
        credentials: "include",
      });
      if (!res.ok) return { id: taskId, checklists: [] };
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 pt-2 text-[var(--pro-text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Loading checklists...</span>
      </div>
    );
  }

  const checklists = task?.checklists || [];
  if (checklists.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--pro-border)] space-y-2">
      {checklists.map((cl) => {
        const done = cl.items.filter((i) => i.isCompleted).length;
        return (
          <div key={cl.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-[var(--pro-text-secondary)]">
                {cl.name}
              </span>
              <span className="text-[10px] text-[var(--pro-text-muted)]">
                {done}/{cl.items.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {cl.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 pl-1"
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-[var(--pro-text-muted)] shrink-0" />
                  )}
                  <span
                    className={`text-xs flex-1 truncate ${
                      item.isCompleted
                        ? "line-through text-[var(--pro-text-muted)]"
                        : "text-[var(--pro-text-primary)]"
                    }`}
                  >
                    {item.description}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 shrink-0 ${
                      itemTypeBadgeClass[item.itemType] || itemTypeBadgeClass.standard
                    }`}
                  >
                    {itemTypeLabels[item.itemType] || "Std"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
