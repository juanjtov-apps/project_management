/**
 * Main agent chat component with input and message display.
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('agent');
  const { t: tc } = useTranslation('common');
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
              {t('title')}
            </h2>
            <p
              className="text-sm leading-tight"
              style={{ color: isLoading ? '#FBBF24' : '#9CA3AF' }}
            >
              {isLoading ? t('thinking') : t('ready')}
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
              title={t('newConversation')}
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
              title={t('closeAssistant')}
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
              onConfirm={(modifiedParams) => confirmOperation(confirmation.id, "confirm", modifiedParams)}
              onReject={() => confirmOperation(confirmation.id, "reject")}
            />
          ))}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} conversationId={conversationId} onSendMessage={sendMessage} />

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
            placeholder={t('inputPlaceholder')}
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
          {t('inputHint')}
        </p>
      </div>
    </div>
  );
}

interface ConfirmationCardProps {
  confirmation: PendingConfirmation;
  onConfirm: (modifiedParams?: Record<string, unknown>) => void;
  onReject: () => void;
}

// Field definitions per tool for the editable confirmation card
const TOOL_FIELDS: Record<string, Array<{
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}>> = {
  create_installment: [
    { key: "name", label: "Name", type: "text" },
    { key: "amount", label: "Amount ($)", type: "number" },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["planned", "payable"] },
  ],
  create_task: [
    { key: "name", label: "Title", type: "text" },
    { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
    { key: "due_date", label: "Due Date", type: "date" },
  ],
  create_issue: [
    { key: "title", label: "Title", type: "text" },
    { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] },
    { key: "category", label: "Category", type: "select", options: ["safety", "quality", "schedule", "budget", "design", "other"] },
  ],
  create_stage: [
    { key: "name", label: "Name", type: "text" },
    { key: "planned_start_date", label: "Start Date", type: "date" },
    { key: "planned_end_date", label: "End Date", type: "date" },
  ],
  update_project_status: [
    { key: "status", label: "Status", type: "select", options: ["active", "on_hold", "completed", "cancelled"] },
  ],
  update_payment_status: [
    { key: "status", label: "Status", type: "select", options: ["planned", "payable", "paid"] },
  ],
  update_issue_status: [
    { key: "status", label: "Status", type: "select", options: ["open", "in_progress", "resolved", "closed"] },
  ],
};

function ConfirmationCard({ confirmation, onConfirm, onReject }: ConfirmationCardProps) {
  const { t } = useTranslation('agent');
  const { t: tc } = useTranslation('common');
  const fields = TOOL_FIELDS[confirmation.toolName];
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>(
    () => ({ ...(confirmation.input || {}) })
  );

  const handleFieldChange = (key: string, value: unknown) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    // Build modified params: only include fields that changed from original
    const original = confirmation.input || {};
    const modified: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedValues)) {
      if (value !== original[key]) {
        modified[key] = value;
      }
    }
    onConfirm(Object.keys(modified).length > 0 ? modified : undefined);
  };

  const inputStyle = {
    backgroundColor: '#0F1115',
    border: '1px solid #2D333B',
    color: '#E5E7EB',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: '#161B22', border: '1px solid #FBBF24' }}
    >
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FBBF24' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {t('confirmationRequired')}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            {confirmation.operationSummary}
          </p>
        </div>
      </div>

      {/* Editable fields */}
      {fields && fields.length > 0 ? (
        <div className="space-y-2 mb-3 ml-6">
          {fields.map(field => {
            const value = editedValues[field.key];
            return (
              <div key={field.key} className="flex items-center gap-2">
                <label className="text-xs w-20 flex-shrink-0 text-right" style={{ color: '#9CA3AF' }}>
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={String(value || "")}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    style={inputStyle}
                    className="cursor-pointer"
                  >
                    {!value && <option value="">—</option>}
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={value !== undefined && value !== null ? String(value) : ""}
                    onChange={e => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                    step="0.01"
                  />
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    value={String(value || "")}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(value || "")}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    style={inputStyle}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        confirmation.impactAssessment && (
          <p className="text-xs mt-1 mb-3 ml-6" style={{ color: '#6B7280' }}>
            {confirmation.impactAssessment}
          </p>
        )
      )}

      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="text-[#9CA3AF] hover:text-white hover:bg-[#2D333B]"
        >
          <X className="w-3 h-3 mr-1" />
          {tc('button.cancel')}
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          style={{ backgroundColor: '#4ADE80', color: '#0F1115' }}
        >
          <Check className="w-3 h-3 mr-1" />
          {tc('button.confirm')}
        </Button>
      </div>
    </div>
  );
}
