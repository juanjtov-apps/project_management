/**
 * EmbeddedChat - Core chat component for the AI dashboard center panel.
 * Wraps the existing useAgentChat hook via the useProeChat context.
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, RotateCcw, AlertCircle, Check, X, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProeChat } from "@/contexts/ProeChatContext";
import { MessageList } from "@/components/agent/MessageList";
import { ActiveToolIndicator } from "@/components/agent/ToolStatus";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import type { PendingConfirmation } from "@/hooks/useAgentChat";

// --- Confirmation Card (reused pattern from AgentChat) ---

interface ConfirmationCardProps {
  confirmation: PendingConfirmation;
  onConfirm: () => void;
  onReject: () => void;
}

function ConfirmationCard({ confirmation, onConfirm, onReject }: ConfirmationCardProps) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: "#161B22", border: "1px solid #FBBF24" }}
    >
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#FBBF24" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Confirmation Required</p>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            {confirmation.operationSummary}
          </p>
          {confirmation.impactAssessment && (
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
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
          style={{ backgroundColor: "#4ADE80", color: "#0F1115" }}
        >
          <Check className="w-3 h-3 mr-1" />
          Confirm
        </Button>
      </div>
    </div>
  );
}

// --- Main EmbeddedChat Component ---

const suggestions = [
  "What's the status of my projects?",
  "Show me overdue tasks",
  "Which projects are at risk?",
  "What's due this week?",
];

export default function EmbeddedChat() {
  const {
    messages,
    isLoading,
    conversationId,
    pendingConfirmations,
    activeToolCall,
    sendMessage,
    confirmOperation,
    clearMessages,
  } = useProeChat();

  const [input, setInput] = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for suggestion clicks (shared event pattern from AgentChat)
  useEffect(() => {
    const handleSuggestion = (e: CustomEvent<string>) => {
      setInput(e.detail);
      inputRef.current?.focus();
    };

    window.addEventListener("agent-suggestion", handleSuggestion as EventListener);
    return () => {
      window.removeEventListener("agent-suggestion", handleSuggestion as EventListener);
    };
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleVoiceSend = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0F1115" }}>
      {/* Proe Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "9px 24px",
          backgroundColor: "#0F1115",
          borderBottom: "1px solid #2D333B",
        }}
      >
        {/* Left: Spark + Proe + Active */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                color: "#4ADE80",
                fontSize: "15px",
                textShadow: "0 0 10px #4ADE80",
                lineHeight: 1,
              }}
            >
              {"\u2726"}
            </span>
            <span
              className="font-semibold text-white"
              style={{ fontSize: "14px" }}
            >
              Proe
            </span>
          </div>

          {/* Active indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={isLoading ? "animate-pulse" : ""}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: "#4ADE80",
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                color: "#4ADE80",
                letterSpacing: "0.05em",
              }}
            >
              {isLoading ? "Working" : "Active"}
            </span>
          </div>
        </div>

        {/* Right: Clear conversation */}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="h-7 w-7 text-[#9CA3AF] hover:text-white hover:bg-[#1F242C]"
            title="New conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Pending confirmations */}
      {pendingConfirmations.length > 0 && (
        <div className="px-4 py-2 space-y-2" style={{ backgroundColor: "#1F242C" }}>
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

      {/* Message area */}
      {messages.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center p-8 overflow-y-auto"
          style={{ backgroundColor: "#0F1115" }}
        >
          <div className="text-center max-w-sm">
            {/* Proe spark icon */}
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: "#161B22" }}
            >
              <span
                style={{
                  color: "#4ADE80",
                  fontSize: "28px",
                  textShadow: "0 0 14px #4ADE80",
                }}
              >
                {"\u2726"}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              How can I help today?
            </h3>
            <p className="text-sm mb-4" style={{ color: "#9CA3AF" }}>
              Ask about projects, tasks, schedules, or anything on-site.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "#2D333B",
                    color: "#9CA3AF",
                  }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1F242C";
                    e.currentTarget.style.borderColor = "#4ADE80";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "#2D333B";
                    e.currentTarget.style.color = "#9CA3AF";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#0F1115" }}>
          <MessageList messages={messages} isLoading={isLoading} conversationId={conversationId} onSendMessage={sendMessage} />
        </div>
      )}

      {/* Active tool indicator */}
      {activeToolCall && (
        <div className="px-4 py-2">
          <ActiveToolIndicator toolCall={activeToolCall} />
        </div>
      )}

      {/* Input zone */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#0F1115",
          borderTop: "1px solid #2D333B",
        }}
      >
        <div className="flex items-end gap-3">
          {/* Text field */}
          <div
            className="flex-1 flex items-end"
            style={{
              backgroundColor: "#161B22",
              borderRadius: "14px",
              border: "1px solid #2D333B",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.borderColor = "#4ADE80";
                  container.style.boxShadow = "0 0 0 2px rgba(74, 222, 128, 0.15)";
                }
              }}
              onBlur={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.borderColor = "#2D333B";
                  container.style.boxShadow = "none";
                }
              }}
              placeholder="Message Proe..."
              className="flex-1 bg-transparent text-white placeholder-[#6B7280] resize-none outline-none text-sm py-3 px-4"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Mic button */}
          <button
            onClick={() => setIsVoiceOpen(true)}
            disabled={isLoading}
            className="flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              backgroundColor: "#1F242C",
              color: "#9CA3AF",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.4 : 1,
              border: "1px solid #2D333B",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = "#4ADE80";
                e.currentTarget.style.color = "#4ADE80";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2D333B";
              e.currentTarget.style.color = "#9CA3AF";
            }}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center flex-shrink-0 transition-transform"
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              backgroundColor: input.trim() && !isLoading ? "#4ADE80" : "#2D333B",
              color: "#0F1115",
              cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
              opacity: !input.trim() || isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isLoading) {
                e.currentTarget.style.transform = "scale(1.04)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p
          className="text-center mt-2"
          style={{ color: "#6B7280", fontSize: "10px" }}
        >
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>

      {/* Voice overlay */}
      <VoiceOverlay
        open={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSend={handleVoiceSend}
      />
    </div>
  );
}
