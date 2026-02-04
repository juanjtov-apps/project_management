/**
 * Agent chat drawer component - slides in from the right side.
 */

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AgentChat } from "./AgentChat";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface AgentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  conversationId?: string | null;
  onConversationIdChange?: (id: string | null) => void;
}

export function AgentDrawer({
  open,
  onOpenChange,
  projectId,
  conversationId,
  onConversationIdChange
}: AgentDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        className="w-full sm:w-[440px] sm:max-w-[440px] p-0 flex flex-col"
        style={{
          backgroundColor: '#0F1115',
          borderColor: '#2D333B',
        }}
      >
        <VisuallyHidden>
          <SheetTitle>AI Assistant</SheetTitle>
        </VisuallyHidden>
        <AgentChat
          projectId={projectId}
          onClose={() => onOpenChange(false)}
          conversationId={conversationId}
          onConversationIdChange={onConversationIdChange}
        />
      </SheetContent>
    </Sheet>
  );
}
