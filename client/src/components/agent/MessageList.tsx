/**
 * Message list component for displaying chat messages.
 */

import { useRef, useEffect, useState, useMemo } from "react";
import { User, Bot, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import type { AgentMessage } from "@/hooks/useAgentChat";
import { ToolStatus } from "./ToolStatus";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseResponse } from "./ResponseParser";
import { CascadeGrid } from "./CascadeGrid";
import { ActionButtons } from "./ActionButtons";
import { WorkflowTags } from "./WorkflowTags";

interface MessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
  conversationId: string | null;
  onSendMessage?: (message: string) => void;
}

export function MessageList({ messages, isLoading, conversationId, onSendMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#1F242C' }}
          >
            <Bot className="w-8 h-8" style={{ color: '#4ADE80' }} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            How can I help you today?
          </h3>
          <p className="text-sm" style={{ color: '#D1D5DB' }}>
            Ask me about your projects, tasks, stages, or materials.
            I can help you get status updates, find information, and more.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {[
              "Show my active projects",
              "What tasks are due this week?",
              "Project status summary",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: '#2D333B',
                  color: '#9CA3AF',
                }}
                onClick={() => {
                  const event = new CustomEvent('agent-suggestion', { detail: suggestion });
                  window.dispatchEvent(event);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1F242C';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} conversationId={conversationId} onSendMessage={onSendMessage} />
      ))}

      {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#1F242C' }}
          >
            <Bot className="w-4 h-4" style={{ color: '#4ADE80' }} />
          </div>
          <div
            className="px-4 py-2 rounded-2xl rounded-tl-sm"
            style={{ backgroundColor: '#1F242C' }}
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#9CA3AF' }} />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: AgentMessage;
  conversationId: string | null;
  onSendMessage?: (message: string) => void;
}

function MessageBubble({ message, conversationId, onSendMessage }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Parse structured blocks from assistant messages (only when not streaming)
  const parsed = useMemo(() => {
    if (!isAssistant || !message.content || message.isStreaming) return null;
    return parseResponse(message.content);
  }, [isAssistant, message.content, message.isStreaming]);

  // Use parsed text if available, otherwise raw content
  const displayContent = parsed?.text || message.content;
  const hasStructuredContent = parsed && (parsed.cascade || parsed.actions || parsed.tags);

  return (
    <div className={`group flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isUser ? '#22C55E' : '#1F242C' }}
      >
        {isUser ? (
          <User className="w-4 h-4" style={{ color: '#0F1115' }} />
        ) : (
          <Bot className="w-4 h-4" style={{ color: '#4ADE80' }} />
        )}
      </div>

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Tool calls — only show while actively running */}
        {message.toolCalls && message.toolCalls.filter(tc => tc.status === "running" || tc.status === "pending").length > 0 && (
          <div className="w-full space-y-2">
            {message.toolCalls
              .filter(tc => tc.status === "running" || tc.status === "pending")
              .map((toolCall, idx) => (
                <ToolStatus key={`${toolCall.tool}-${idx}`} toolCall={toolCall} />
              ))}
          </div>
        )}

        {/* Message content */}
        {displayContent && (
          <div
            className={`px-4 py-2 rounded-2xl ${
              isUser ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
            style={{
              backgroundColor: isUser ? '#22C55E' : '#1F242C',
              color: isUser ? '#022C22' : '#FFFFFF',
            }}
          >
            <div className="message-content text-sm whitespace-pre-wrap break-words">
              <FormattedContent content={displayContent} />
            </div>

            {message.isStreaming && (
              <span
                className="inline-block w-2 h-4 ml-1 animate-pulse"
                style={{ backgroundColor: isUser ? '#0F1115' : '#4ADE80' }}
              />
            )}
          </div>
        )}

        {/* Structured response blocks (assistant only, after streaming completes) */}
        {hasStructuredContent && (
          <div className="w-full">
            {parsed.tags && <WorkflowTags tags={parsed.tags} />}
            {parsed.cascade && <CascadeGrid cascade={parsed.cascade} />}
            {parsed.actions && onSendMessage && (
              <ActionButtons actions={parsed.actions} onAction={onSendMessage} />
            )}
          </div>
        )}

        {/* Feedback buttons and timestamp for assistant messages */}
        <div className="flex items-center gap-2">
          {isAssistant && !message.isStreaming && conversationId && (
            <FeedbackButtons messageId={message.id} conversationId={conversationId} />
          )}
          <span className="text-xs px-1" style={{ color: '#9CA3AF' }}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface FeedbackButtonsProps {
  messageId: string;
  conversationId: string;
}

function FeedbackButtons({ messageId, conversationId }: FeedbackButtonsProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const submitFeedback = async (isPositive: boolean, notes?: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiRequest("/api/v1/agent/feedback", {
        method: "POST",
        body: {
          message_id: messageId,
          conversation_id: conversationId,
          is_positive: isPositive,
          notes: notes || null,
        },
      });
      setFeedbackGiven(isPositive ? 'positive' : 'negative');
      setShowNoteInput(false);
      setNote("");
      toast({ title: 'Feedback sent', description: 'Thank you for your feedback!' });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast({ title: 'Error', description: 'Failed to send feedback. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbsDown = () => {
    if (feedbackGiven) return;
    setShowNoteInput(true);
  };

  const handleSubmitWithNote = () => {
    submitFeedback(false, note);
  };

  const handleSkipNote = () => {
    submitFeedback(false);
  };

  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-1 px-1">
        {feedbackGiven === 'positive' ? (
          <ThumbsUp className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
        )}
        <span className="text-xs" style={{ color: '#6B7280' }}>Thanks!</span>
      </div>
    );
  }

  if (showNoteInput) {
    return (
      <div className="flex flex-col gap-2 p-2 rounded-lg" style={{ backgroundColor: '#1F242C' }}>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>What could be improved?</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional feedback..."
          className="text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1"
          style={{
            backgroundColor: '#0F1115',
            borderColor: '#2D333B',
            color: '#FFFFFF',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitWithNote();
            if (e.key === 'Escape') setShowNoteInput(false);
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmitWithNote}
            disabled={isSubmitting}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ backgroundColor: '#22C55E', color: '#022C22' }}
          >
            Submit
          </button>
          <button
            onClick={handleSkipNote}
            disabled={isSubmitting}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ backgroundColor: '#2D333B', color: '#9CA3AF' }}
          >
            Skip
          </button>
          <button
            onClick={() => setShowNoteInput(false)}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: '#6B7280' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => submitFeedback(true)}
        disabled={isSubmitting}
        className="p-1 rounded hover:bg-opacity-20 transition-colors"
        style={{ color: '#6B7280' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#4ADE80'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; }}
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleThumbsDown}
        disabled={isSubmitting}
        className="p-1 rounded hover:bg-opacity-20 transition-colors"
        style={{ color: '#6B7280' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; }}
        title="Needs improvement"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface FormattedContentProps {
  content: string;
}

function FormattedContent({ content }: FormattedContentProps) {
  // Simple markdown-like formatting
  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        // Headers (## Header)
        if (line.startsWith('## ')) {
          return (
            <div key={idx} className="font-semibold text-base mt-2 mb-1">
              {line.slice(3)}
            </div>
          );
        }

        // Headers (### Header)
        if (line.startsWith('### ')) {
          return (
            <div key={idx} className="font-medium mt-2 mb-1">
              {line.slice(4)}
            </div>
          );
        }

        // List items
        if (line.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-2">
              <span style={{ color: '#4ADE80' }}>•</span>
              <span>{formatBoldText(line.slice(2))}</span>
            </div>
          );
        }

        // Status icons
        if (line.startsWith('[x]') || line.startsWith('[>]') || line.startsWith('[ ]') || line.startsWith('[!]') || line.startsWith('[~]')) {
          const icon = line.slice(0, 3);
          const text = line.slice(3).trim();
          const iconMap: Record<string, { symbol: string; color: string }> = {
            '[x]': { symbol: '✓', color: '#4ADE80' },
            '[>]': { symbol: '▶', color: '#60A5FA' },
            '[ ]': { symbol: '○', color: '#6B7280' },
            '[!]': { symbol: '!', color: '#EF4444' },
            '[~]': { symbol: '~', color: '#FBBF24' },
          };
          const iconStyle = iconMap[icon] || iconMap['[ ]'];

          return (
            <div key={idx} className="flex gap-2 items-start">
              <span style={{ color: iconStyle.color }}>{iconStyle.symbol}</span>
              <span>{formatBoldText(text)}</span>
            </div>
          );
        }

        // Indented content
        if (line.startsWith('    ') || line.startsWith('\t')) {
          return (
            <div key={idx} className="ml-4 text-sm opacity-90">
              {formatBoldText(line.trim())}
            </div>
          );
        }

        // Empty lines
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }

        // Regular text
        return (
          <div key={idx}>
            {formatBoldText(line)}
          </div>
        );
      })}
    </>
  );
}

function formatBoldText(text: string): React.ReactNode {
  // Match **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

function formatTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Just now";
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
