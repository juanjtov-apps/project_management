import { useQuery } from "@tanstack/react-query";
import { useProeChat } from "@/contexts/ProeChatContext";

interface BriefingData {
  greeting: string;
  userName: string;
  timestamp: string;
  headline: string;
  stats: {
    activeProjects: number;
    tasksDueToday: number;
    overdueItems: number;
    atRiskProjects: number;
    openIssues: number;
  };
  insights: Array<{
    text: string;
    prompt: string;
    variant: "active" | "muted";
  }>;
}

export default function MorningBriefing() {
  const { sendMessage } = useProeChat();

  const { data: briefing, isLoading } = useQuery<BriefingData>({
    queryKey: ["/api/v1/briefing/morning"],
    queryFn: async () => {
      const res = await fetch("/api/v1/briefing/morning", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch briefing");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const handleChipClick = (prompt: string) => {
    sendMessage(prompt);
  };

  // Parse headline to render <hl> tags as mint-colored spans
  const renderHeadline = (html: string) => {
    const parts = html.split(/(<hl>.*?<\/hl>)/g);
    return parts.map((part, i) => {
      const match = part.match(/<hl>(.*?)<\/hl>/);
      if (match) {
        return (
          <span key={i} style={{ color: "#4ADE80", fontStyle: "normal", fontWeight: 500 }}>
            {match[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="shrink-0 px-6 py-5" style={{ background: "#161B22" }}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded" style={{ background: "#1F242C" }} />
          <div className="h-5 w-72 rounded" style={{ background: "#1F242C" }} />
          <div className="flex gap-2">
            <div className="h-6 w-28 rounded-full" style={{ background: "#1F242C" }} />
            <div className="h-6 w-24 rounded-full" style={{ background: "#1F242C" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div
      className="shrink-0 relative overflow-hidden"
      style={{ background: "#161B22" }}
    >
      {/* Radial mint glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 420,
          height: 120,
          background: "radial-gradient(ellipse, rgba(74,222,128,0.055) 0%, transparent 70%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 32,
          background: "linear-gradient(transparent, #0F1115)",
        }}
      />

      <div className="relative z-10 px-6 py-4">
        {/* Tag pill + live dot */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{
              fontFamily: "monospace",
              fontSize: "8.5px",
              color: "#4ADE80",
              background: "#1F242C",
              border: "1px solid #2D333B",
              borderRadius: 3,
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 4,
                height: 4,
                background: "#4ADE80",
                boxShadow: "0 0 6px #4ADE80",
                animation: "pulse-glow 2s infinite",
              }}
            />
            LIVE BRIEFING
          </span>
          <span style={{ fontFamily: "monospace", fontSize: "8.5px", color: "#9CA3AF" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Greeting + Headline */}
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(16px, 1.6vw, 20px)",
            color: "#FFFFFF",
            lineHeight: 1.45,
            marginBottom: 10,
          }}
        >
          {briefing.greeting}, {briefing.userName}. {renderHeadline(briefing.headline)}
        </p>

        {/* Action chips */}
        <div className="flex flex-wrap gap-2">
          {briefing.insights.map((insight, i) => (
            <button
              key={i}
              onClick={() => handleChipClick(insight.prompt)}
              className="transition-all duration-200"
              style={{
                borderRadius: 20,
                fontSize: "11.5px",
                padding: "4px 12px",
                border: insight.variant === "active"
                  ? "1px solid rgba(74,222,128,0.3)"
                  : "1px solid #2D333B",
                background: insight.variant === "active"
                  ? "rgba(74,222,128,0.08)"
                  : "transparent",
                color: insight.variant === "active" ? "#4ADE80" : "#9CA3AF",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(74,222,128,0.4)";
                e.currentTarget.style.color = "#4ADE80";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = insight.variant === "active"
                  ? "rgba(74,222,128,0.3)"
                  : "#2D333B";
                e.currentTarget.style.color = insight.variant === "active" ? "#4ADE80" : "#9CA3AF";
              }}
            >
              {insight.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
