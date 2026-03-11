/**
 * AI-Native Dashboard - Conversation-first layout.
 * 3-column: Sidebar (rendered by AuthenticatedLayout) + Center (Briefing + Chat) + Right (Active Jobs)
 */

import { useTranslation } from 'react-i18next';
import MorningBriefing from "@/components/ai-dashboard/MorningBriefing";
import ZoneSeparator from "@/components/ai-dashboard/ZoneSeparator";
import EmbeddedChat from "@/components/ai-dashboard/EmbeddedChat";
import RightPanel from "@/components/ai-dashboard/RightPanel";

export default function AIDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation('dashboard');
  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ backgroundColor: "#0F1115" }}
    >
      {/* Center panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div data-tour="morning-briefing" className="shrink-0">
          <MorningBriefing />
        </div>
        <ZoneSeparator />
        <div data-tour="embedded-chat" className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EmbeddedChat />
        </div>
      </div>

      {/* Right panel - hidden on smaller screens */}
      <div className="hidden xl:block" data-tour="active-jobs">
        <RightPanel />
      </div>
    </div>
  );
}
