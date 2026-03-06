/**
 * AI-Native Dashboard - Conversation-first layout.
 * 3-column: Sidebar (rendered by AuthenticatedLayout) + Center (Briefing + Chat) + Right (Active Jobs)
 */

import MorningBriefing from "@/components/ai-dashboard/MorningBriefing";
import ZoneSeparator from "@/components/ai-dashboard/ZoneSeparator";
import EmbeddedChat from "@/components/ai-dashboard/EmbeddedChat";
import RightPanel from "@/components/ai-dashboard/RightPanel";

export default function AIDashboard() {
  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ backgroundColor: "#0F1115" }}
    >
      {/* Center panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MorningBriefing />
        <ZoneSeparator />
        <EmbeddedChat />
      </div>

      {/* Right panel - hidden on smaller screens */}
      <div className="hidden xl:block">
        <RightPanel />
      </div>
    </div>
  );
}
