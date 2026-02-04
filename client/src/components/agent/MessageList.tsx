/**
 * Message list component for displaying chat messages.
 */

import { useRef, useEffect } from "react";
import { User, Bot, Loader2 } from "lucide-react";
import type { AgentMessage } from "@/hooks/useAgentChat";
import { ToolStatus } from "./ToolStatus";

interface MessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
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
        <MessageBubble key={message.id} message={message} />
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
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
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
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-2">
            {message.toolCalls.map((toolCall, idx) => (
              <ToolStatus key={`${toolCall.tool}-${idx}`} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
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
              <FormattedContent content={message.content} />
            </div>

            {message.isStreaming && (
              <span
                className="inline-block w-2 h-4 ml-1 animate-pulse"
                style={{ backgroundColor: isUser ? '#0F1115' : '#4ADE80' }}
              />
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs px-1" style={{ color: '#9CA3AF' }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
