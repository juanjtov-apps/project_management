import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ActiveJobCard from "./ActiveJobCard";
import { useProeChat } from "@/contexts/ProeChatContext";

export default function RightPanel() {
  const { sendMessage } = useProeChat();

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/projects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      return Array.isArray(data) ? data : data.projects || [];
    },
  });

  const activeProjects = (projects || []).filter(
    (p: any) => p.status !== "completed"
  );

  const handleProjectClick = (name: string, id: string) => {
    sendMessage(`Tell me about the ${name} project`);
  };

  return (
    <div
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: 340,
        minWidth: 340,
        background: "#161B22",
        borderLeft: "1px solid #2D333B",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9CA3AF",
          }}
        >
          Active Jobs
        </span>
        <a
          href="/work"
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#4ADE80",
          }}
        >
          View all →
        </a>
      </div>

      {/* Job cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#4ADE80" }} />
          </div>
        ) : activeProjects.length === 0 ? (
          <p className="text-center py-8" style={{ fontSize: 12, color: "#9CA3AF" }}>
            No active projects
          </p>
        ) : (
          activeProjects.map((project: any) => (
            <ActiveJobCard
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                status: project.status,
                progress: project.progress || 0,
                location: project.location,
                dueDate: project.dueDate || project.due_date,
                coverPhotoId: project.coverPhotoId || project.cover_photo_id,
                aiInsightText: project.aiInsightText || project.ai_insight_text,
              }}
              onProjectClick={handleProjectClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
