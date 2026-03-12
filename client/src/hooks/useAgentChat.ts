/**
 * Hook for managing agent chat with SSE streaming.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ToolCall {
  tool: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  success?: boolean;
  error?: string;
  status: "pending" | "running" | "success" | "error";
}

export interface PendingConfirmation {
  id: string;
  toolName: string;
  operationSummary: string;
  impactAssessment?: string;
  expiresAt: string;
  input?: Record<string, unknown>;
}

interface UseAgentChatOptions {
  projectId?: string;
  initialConversationId?: string | null;
  onConversationIdChange?: (id: string | null) => void;
  onError?: (error: string) => void;
}

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  conversationId: string | null;
  pendingConfirmations: PendingConfirmation[];
  activeToolCall: ToolCall | null;
  sendMessage: (message: string) => Promise<void>;
  confirmOperation: (confirmationId: string, action: "confirm" | "reject", modifiedParams?: Record<string, unknown>) => Promise<void>;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}

// Maps tool names to React Query cache key prefixes to invalidate after execution.
// Uses startsWith matching so "/api/client-issues" matches "/api/client-issues?project_id=xxx".
const TOOL_CACHE_MAP: Record<string, string[]> = {
  create_project: ["/api/projects"],
  create_task: ["/api/tasks"],
  update_task_status: ["/api/tasks"],
  assign_task: ["/api/tasks"],
  delete_task: ["/api/tasks"],
  create_issue: ["/api/client-issues"],
  update_issue_status: ["/api/client-issues"],
  create_installment: ["/api/projects", "/api/payment"],
  update_payment_status: ["/api/projects", "/api/payment"],
  update_installment: ["/api/projects", "/api/payment"],
  create_stage: ["/api/v1/stages"],
  update_stage: ["/api/v1/stages"],
  apply_stage_template: ["/api/v1/stages"],
  create_material_item: ["/api/v1/stages"],
  update_project_status: ["/api/projects"],
  update_project_details: ["/api/projects"],
  create_daily_log: ["/api/logs"],
};

function invalidateCacheKeys(queryClient: ReturnType<typeof useQueryClient>, keys: string[]) {
  keys.forEach(prefix => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith(prefix);
      },
    });
  });
}

function buildActionBlock(actions: Array<{label: string; prompt?: string; navigateTo?: string}>): string {
  return `\n\n\`\`\`json\n${JSON.stringify({ actions })}\n\`\`\``;
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const { projectId, initialConversationId, onConversationIdChange, onError } = options;

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationIdState] = useState<string | null>(initialConversationId || null);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [activeToolCall, setActiveToolCall] = useState<ToolCall | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSuggestedActionsRef = useRef<Array<{label: string; prompt?: string; navigateTo?: string}> | null>(null);

  // Wrapper to also notify parent of conversation ID changes
  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
    onConversationIdChange?.(id);
  }, [onConversationIdChange]);

  // Load existing conversation on mount if initialConversationId is provided
  useEffect(() => {
    if (initialConversationId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadConversation(initialConversationId);
    }
  }, [initialConversationId]);

  // Load conversation history from backend
  const loadConversation = useCallback(async (convId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/v1/agent/conversations/${convId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        // Conversation not found or expired - start fresh
        setConversationIdState(null);
        onConversationIdChange?.(null);
        return;
      }

      const data = await response.json();

      // Convert backend messages to AgentMessage format
      const loadedMessages: AgentMessage[] = (data.messages || []).map((msg: any) => ({
        id: msg.id || `${msg.role}-${msg.created_at || Date.now()}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || "",
        toolCalls: msg.tool_calls?.map((tc: any) => ({
          tool: tc.tool_name,
          input: tc.input,
          result: tc.result,
          success: tc.success,
          error: tc.error,
          status: tc.success === false ? "error" : "success",
        })) || [],
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
        isStreaming: false,
      })).filter((msg: AgentMessage) => msg.role !== "system"); // Filter out system messages

      setMessages(loadedMessages);
      setConversationIdState(convId);
    } catch (error) {
      console.warn("Failed to load conversation:", error);
      // Start fresh on error
      setConversationIdState(null);
      onConversationIdChange?.(null);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [onConversationIdChange]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setActiveToolCall(null);

    // Create placeholder for assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: AgentMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      toolCalls: [],
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/v1/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          project_id: projectId,
          language: i18n.language,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr.trim()) continue;

            try {
              const data = JSON.parse(dataStr);

              // Handle different event types based on data structure
              if (data.content !== undefined) {
                // Content chunk
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ));
              } else if (data.confirmation_id) {
                // Confirmation required — clear the active tool spinner
                setActiveToolCall(null);
                setPendingConfirmations(prev => [...prev, {
                  id: data.confirmation_id,
                  toolName: data.tool_name || data.tool,
                  operationSummary: data.operation_summary || data.message,
                  impactAssessment: data.impact_assessment,
                  expiresAt: data.expires_at,
                  input: data.input,
                }]);
                // Update the tool call status in the message
                setMessages(prev => prev.map(msg => {
                  if (msg.id !== assistantMessageId) return msg;
                  const toolCalls = msg.toolCalls || [];
                  const idx = toolCalls.findIndex(tc => tc.tool === (data.tool_name || data.tool) && tc.status === "running");
                  if (idx >= 0) {
                    const newToolCalls = [...toolCalls];
                    newToolCalls[idx] = { ...newToolCalls[idx], status: "success" };
                    return { ...msg, toolCalls: newToolCalls };
                  }
                  return msg;
                }));
              } else if (data.tool !== undefined && data.input !== undefined && data.result === undefined) {
                // Tool start
                const toolCall: ToolCall = {
                  tool: data.tool,
                  input: data.input,
                  status: "running",
                };
                setActiveToolCall(toolCall);
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
                    : msg
                ));
              } else if (data.tool !== undefined && (data.result !== undefined || data.error !== undefined)) {
                // Tool result
                const updatedToolCall: ToolCall = {
                  tool: data.tool,
                  result: data.result,
                  success: data.success ?? true,
                  error: data.error,
                  status: data.success === false ? "error" : "success",
                };
                setActiveToolCall(null);
                setMessages(prev => prev.map(msg => {
                  if (msg.id !== assistantMessageId) return msg;
                  const toolCalls = msg.toolCalls || [];
                  const idx = toolCalls.findIndex(tc => tc.tool === data.tool && tc.status === "running");
                  if (idx >= 0) {
                    const newToolCalls = [...toolCalls];
                    newToolCalls[idx] = updatedToolCall;
                    return { ...msg, toolCalls: newToolCalls };
                  }
                  return msg;
                }));
                // Invalidate relevant caches after successful tool execution
                if (data.success !== false) {
                  const keysToInvalidate = TOOL_CACHE_MAP[data.tool];
                  if (keysToInvalidate) {
                    invalidateCacheKeys(queryClient, keysToInvalidate);
                  }
                }
                // Store suggested_actions from tool result for fallback rendering
                if (data.result?.suggested_actions) {
                  lastSuggestedActionsRef.current = data.result.suggested_actions;
                }
              } else if (data.conversation_id !== undefined) {
                // Done event
                setConversationId(data.conversation_id);
                // Update the assistant message with the actual database ID for feedback
                // Also set isStreaming: false here since we're done
                const finalMessageId = data.message_id || assistantMessageId;
                if (data.message_id) {
                  setMessages(prev => {
                    return prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, id: data.message_id, isStreaming: false }
                        : msg
                    );
                  });
                }
                // Inject suggested_actions as fallback if LLM didn't include action blocks
                const pendingActions = lastSuggestedActionsRef.current;
                if (pendingActions?.length) {
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === finalMessageId && !msg.content.includes('"actions"')) {
                      return { ...msg, content: msg.content + buildActionBlock(pendingActions) };
                    }
                    return msg;
                  }));
                  lastSuggestedActionsRef.current = null;
                }
              } else if (data.message !== undefined && !data.tool) {
                // Error event
                onError?.(data.message);
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + `\n\nError: ${data.message}` }
                    : msg
                ));
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", dataStr, e);
            }
          }
        }
      }

      // Mark streaming as complete (only if not already done in the done event handler)
      // This handles the fallback case where no message_id was received
      setMessages(prev => prev.map(msg =>
        (msg.id === assistantMessageId || (msg.role === "assistant" && msg.isStreaming))
          ? { ...msg, isStreaming: false }
          : msg
      ));
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Request was cancelled
        return;
      }

      const errorMessage = (error as Error).message || "An error occurred";
      onError?.(errorMessage);

      // Update assistant message with error
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setActiveToolCall(null);
    }
  }, [conversationId, projectId, isLoading, onError]);

  const confirmOperation = useCallback(async (
    confirmationId: string,
    action: "confirm" | "reject",
    modifiedParams?: Record<string, unknown>
  ) => {
    try {
      const body: Record<string, unknown> = {
        confirmation_id: confirmationId,
        action,
      };
      if (modifiedParams && Object.keys(modifiedParams).length > 0) {
        body.modified_params = modifiedParams;
      }

      const response = await fetch("/api/v1/agent/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();

      // Remove from pending confirmations
      setPendingConfirmations(prev =>
        prev.filter(c => c.id !== confirmationId)
      );

      // Add result as a new assistant message
      if (action === "confirm" && data.result) {
        const execResult = data.result.result;
        // Use LLM continuation response (formatted with highlights) if available
        let content = data.result.continuation
          ? data.result.continuation
          : data.result.success
            ? (execResult?.message || "Operation completed successfully.")
            : `Operation failed: ${data.result.error}`;

        // Append action buttons from suggested_actions (only if no continuation, as continuation may have its own context)
        if (!data.result.continuation && data.result.success && execResult?.suggested_actions?.length) {
          content += buildActionBlock(execResult.suggested_actions);
        }

        // Invalidate relevant caches
        const conf = pendingConfirmations.find(c => c.id === confirmationId);
        if (conf && data.result.success) {
          const keysToInvalidate = TOOL_CACHE_MAP[conf.toolName];
          if (keysToInvalidate) {
            invalidateCacheKeys(queryClient, keysToInvalidate);
          }
        }

        setMessages(prev => [...prev, {
          id: `confirm-result-${Date.now()}`,
          role: "assistant" as const,
          content,
          timestamp: new Date(),
          isStreaming: false,
        }]);
      } else if (action === "reject") {
        setMessages(prev => [...prev, {
          id: `confirm-reject-${Date.now()}`,
          role: "assistant" as const,
          content: "Operation cancelled.",
          timestamp: new Date(),
          isStreaming: false,
        }]);
      }
    } catch (error) {
      onError?.((error as Error).message || "Failed to process confirmation");
    }
  }, [onError, pendingConfirmations, queryClient]);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setConversationIdState(null);
    onConversationIdChange?.(null);
    setPendingConfirmations([]);
    setActiveToolCall(null);
    setIsLoading(false);
    hasLoadedRef.current = false;
  }, [onConversationIdChange]);

  return {
    messages,
    isLoading,
    conversationId,
    pendingConfirmations,
    activeToolCall,
    sendMessage,
    confirmOperation,
    clearMessages,
    setConversationId,
  };
}
