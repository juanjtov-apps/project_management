/**
 * Main agent chat component with input and message display.
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, RotateCcw, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentChat, type PendingConfirmation } from "@/hooks/useAgentChat";
import { MessageList } from "./MessageList";
import { ActiveToolIndicator } from "./ToolStatus";
import { useToast } from "@/hooks/use-toast";

interface AgentChatProps {
  projectId?: string;
  onClose?: () => void;
  conversationId?: string | null;
  onConversationIdChange?: (id: string | null) => void;
}

export function AgentChat({ projectId, onClose, conversationId: initialConversationId, onConversationIdChange }: AgentChatProps) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    conversationId,
    pendingConfirmations,
    activeToolCall,
    sendMessage,
    confirmOperation,
    clearMessages,
  } = useAgentChat({
    projectId,
    initialConversationId: initialConversationId || undefined,
    onConversationIdChange,
    onError: (error) => {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    },
  });

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle suggestion clicks
  useEffect(() => {
    const handleSuggestion = (e: CustomEvent<string>) => {
      setInput(e.detail);
      inputRef.current?.focus();
    };

    window.addEventListener('agent-suggestion', handleSuggestion as EventListener);
    return () => {
      window.removeEventListener('agent-suggestion', handleSuggestion as EventListener);
    };
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#2D333B' }}
      >
        {/* Left: Avatar + Title/Subtitle */}
        <div className="flex items-center gap-3">
          {/* Avatar with status indicator */}
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#4ADE80' }}
            >
              <span className="text-sm font-bold" style={{ color: '#0F1115' }}>AI</span>
            </div>
            {/* Status dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isLoading ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isLoading ? '#FBBF24' : '#4ADE80',
                borderColor: '#0F1115'
              }}
            />
          </div>

          {/* Title and subtitle */}
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-white leading-tight">
              Proesphere Assistant
            </h2>
            <p
              className="text-sm leading-tight"
              style={{ color: isLoading ? '#FBBF24' : '#9CA3AF' }}
            >
              {isLoading ? "Thinking..." : "Ready to help"}
            </p>
          </div>
        </div>

        {/* Right: Action buttons aligned */}
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-9 w-9 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C]"
              title="New conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C]"
              title="Close assistant"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Pending confirmations */}
      {pendingConfirmations.length > 0 && (
        <div className="px-4 py-2 space-y-2" style={{ backgroundColor: '#1F242C' }}>
          {pendingConfirmations.map((confirmation) => (
            <ConfirmationCard
              key={confirmation.id}
              confirmation={confirmation}
              onConfirm={() => confirmOperation(confirmation.id, "confirm")}
              onReject={() => confirmOperation(confirmation.id, "reject")}
            />
          ))}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} conversationId={conversationId} />

      {/* Active tool indicator */}
      {activeToolCall && (
        <div className="px-4 py-2">
          <ActiveToolIndicator toolCall={activeToolCall} />
        </div>
      )}

      {/* Input area */}
      <div
        className="p-4 border-t"
        style={{ borderColor: '#2D333B' }}
      >
        <div
          className="flex items-end gap-2 p-2 rounded-xl"
          style={{ backgroundColor: '#1F242C' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your projects..."
            className="flex-1 bg-transparent text-white placeholder-[#6B7280] resize-none outline-none text-sm py-2 px-2"
            style={{ minHeight: "40px", maxHeight: "120px" }}
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-full flex-shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: input.trim() && !isLoading ? '#4ADE80' : '#2D333B',
              color: '#0F1115',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-center mt-2" style={{ color: '#6B7280' }}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

interface ConfirmationCardProps {
  confirmation: PendingConfirmation;
  onConfirm: () => void;
  onReject: () => void;
}

function ConfirmationCard({ confirmation, onConfirm, onReject }: ConfirmationCardProps) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: '#161B22', border: '1px solid #FBBF24' }}
    >
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FBBF24' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            Confirmation Required
          </p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {confirmation.operationSummary}
          </p>
          {confirmation.impactAssessment && (
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {confirmation.impactAssessment}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="text-[#9CA3AF] hover:text-white hover:bg-[#2D333B]"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          style={{ backgroundColor: '#4ADE80', color: '#0F1115' }}
        >
          <Check className="w-3 h-3 mr-1" />
          Confirm
        </Button>
      </div>
    </div>
  );
}
