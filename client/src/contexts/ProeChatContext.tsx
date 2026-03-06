import { createContext, useContext, ReactNode } from "react";
import { useAgentChat, type AgentMessage, type PendingConfirmation, type ToolCall } from "@/hooks/useAgentChat";

interface ProeChatContextValue {
  messages: AgentMessage[];
  isLoading: boolean;
  conversationId: string | null;
  pendingConfirmations: PendingConfirmation[];
  activeToolCall: ToolCall | null;
  sendMessage: (message: string) => Promise<void>;
  confirmOperation: (confirmationId: string, action: "confirm" | "reject") => Promise<void>;
  clearMessages: () => void;
}

const ProeChatContext = createContext<ProeChatContextValue | null>(null);

const SESSION_KEY = "proe_conversation_id";

export function ProeChatProvider({ children }: { children: ReactNode }) {
  const storedConvId = sessionStorage.getItem(SESSION_KEY);

  const chat = useAgentChat({
    initialConversationId: storedConvId || undefined,
    onConversationIdChange: (id) => {
      if (id) {
        sessionStorage.setItem(SESSION_KEY, id);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    },
    onError: (error) => {
      console.error("Proe chat error:", error);
    },
  });

  return (
    <ProeChatContext.Provider value={chat}>
      {children}
    </ProeChatContext.Provider>
  );
}

export function useProeChat(): ProeChatContextValue {
  const context = useContext(ProeChatContext);
  if (!context) {
    throw new Error("useProeChat must be used within a ProeChatProvider");
  }
  return context;
}
