"""
Agent orchestrator - manages the agentic loop for processing user requests.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, List, AsyncIterator, Optional

from ..llm.provider_factory import get_cached_llm_provider
from ..llm.model_router import model_router
from ..tools.registry import tool_registry, register_default_tools
from ..tools.executor import tool_executor, PermissionDenied
from ..repositories.agent_repository import agent_repo
from .context_builder import context_builder
from src.core.config import settings

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Main orchestrator for the agentic loop.

    The orchestrator manages the plan-execute-reflect pattern:
    1. Classifies intent from user message
    2. Plans execution by decomposing into tool calls
    3. Executes tools in sequence
    4. Synthesizes response from tool results
    5. Logs interaction for analytics
    """

    def __init__(self):
        self.max_tool_calls = settings.agent_max_tool_calls

        # Ensure tools are registered
        register_default_tools()

    async def process_message(
        self,
        message: str,
        conversation_id: Optional[str],
        project_id: Optional[str],
        user_context: Dict[str, Any],
        attachments: Optional[List[str]] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process a user message through the agentic loop.

        Args:
            message: The user's message.
            conversation_id: Existing conversation ID or None to create new.
            project_id: Optional project context.
            user_context: User information (id, company_id, role, permissions).
            attachments: Optional file paths for photos/documents.

        Yields:
            SSE events with types: content, tool_start, tool_result,
            confirmation_required, error, done
        """
        start_time = time.time()
        llm_provider = get_cached_llm_provider()

        # 1. Get or create conversation
        if conversation_id:
            conversation = await agent_repo.get_conversation(
                conversation_id,
                company_id=user_context.get("company_id"),
            )
            if not conversation:
                yield {
                    "type": "error",
                    "data": {"message": "Conversation not found or access denied"}
                }
                return
        else:
            conversation = await agent_repo.create_conversation(
                user_id=user_context["user_id"],
                company_id=user_context.get("company_id"),
                project_id=project_id,
            )

        conversation_id = conversation["id"]

        # 2. Build system prompt and context
        system_prompt = await context_builder.build_system_prompt(
            user_context=user_context,
            project_id=project_id or conversation.get("projectId"),
        )

        # 3. Get conversation history
        history = await agent_repo.get_messages_for_llm(
            conversation_id,
            limit=30,
        )

        # 4. Build messages for LLM
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})

        # 5. Get available tools for user's role
        user_role = user_context.get("role", "user")
        tools = tool_registry.get_tool_definitions(user_role)

        # 6. Select model based on message complexity
        selected_model = model_router.select_model(
            intent=None,  # Could add intent classification here
            tool_calls=[],
            message_length=sum(len(m.get("content", "")) for m in messages),
        )

        # 7. Save user message
        user_message = await agent_repo.save_message(
            conversation_id=conversation_id,
            role="user",
            content=message,
        )

        # 8. Agentic loop
        tool_call_count = 0
        accumulated_content = ""
        tool_calls_made = []

        try:
            while tool_call_count < self.max_tool_calls:
                # Track tool calls at start of iteration to detect new calls
                tool_calls_at_start = len(tool_calls_made)

                # Call LLM
                async for chunk in llm_provider.chat_completion(
                    messages=messages,
                    tools=tools if tools else None,
                    model=selected_model,
                    temperature=model_router.get_temperature(),
                    max_tokens=model_router.get_max_tokens(),
                    stream=True,
                ):
                    chunk_type = chunk.get("type")

                    if chunk_type == "content":
                        content = chunk.get("content", "")
                        accumulated_content += content
                        yield {"type": "content", "data": {"content": content}}

                    elif chunk_type == "tool_use":
                        tool_call_count += 1
                        tool_name = chunk.get("name")
                        tool_input = chunk.get("input", {})
                        tool_call_id = chunk.get("id", f"call_{tool_call_count}")

                        yield {
                            "type": "tool_start",
                            "data": {"tool": tool_name, "input": tool_input}
                        }

                        # Validate tool call
                        validation = await tool_executor.validate_and_check_confirmation(
                            tool_name=tool_name,
                            params=tool_input,
                            context=user_context,
                        )

                        if not validation["allowed"]:
                            yield {
                                "type": "error",
                                "data": {
                                    "message": f"Tool '{tool_name}' not permitted: {validation['reason']}"
                                }
                            }
                            # Send proper tool result so LLM knows the call failed
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{"id": tool_call_id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_input)}}],
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": f"Permission denied: {validation['reason']}",
                            })
                            continue

                        if validation["requires_confirmation"]:
                            # Persist tool_call to DB
                            tool_call_record = await agent_repo.save_tool_call(
                                message_id=user_message["id"],
                                conversation_id=conversation_id,
                                user_id=user_context["user_id"],
                                tool_name=tool_name,
                                tool_input=tool_input,
                                safety_level="requires_confirmation",
                                project_id=project_id or user_context.get("project_id"),
                                execution_status="pending",
                                confirmation_required=True,
                            )

                            # Build human-readable summary
                            operation_summary = self._build_operation_summary(tool_name, tool_input)

                            # Persist pending_confirmation to DB
                            confirmation = await agent_repo.create_pending_confirmation(
                                tool_call_id=tool_call_record["id"],
                                conversation_id=conversation_id,
                                user_id=user_context["user_id"],
                                tool_name=tool_name,
                                operation_summary=operation_summary,
                            )

                            yield {
                                "type": "confirmation_required",
                                "data": {
                                    "confirmation_id": confirmation["id"],
                                    "tool_name": tool_name,
                                    "tool": tool_name,
                                    "input": tool_input,
                                    "operation_summary": operation_summary,
                                    "message": f"Tool '{tool_name}' requires confirmation",
                                }
                            }
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{"id": tool_call_id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_input)}}],
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": "Action requires user confirmation. Please inform the user that this action needs their approval before proceeding.",
                            })
                            continue

                        # Execute tool
                        try:
                            result = await tool_executor.execute(
                                tool_name=tool_name,
                                params=tool_input,
                                context=user_context,
                                message_id=user_message["id"],
                                conversation_id=conversation_id,
                            )

                            tool_calls_made.append({
                                "name": tool_name,
                                "input": tool_input,
                                "result": result,
                            })

                            yield {
                                "type": "tool_result",
                                "data": {
                                    "tool": tool_name,
                                    "success": True,
                                    "result": result,
                                }
                            }

                            # Add tool call + result in proper OpenAI format
                            # so the LLM recognizes its tool was executed
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{"id": tool_call_id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_input)}}],
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": self._summarize_result(result),
                            })

                        except PermissionDenied as e:
                            yield {
                                "type": "error",
                                "data": {"message": str(e)}
                            }
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{"id": tool_call_id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_input)}}],
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": f"Permission denied: {str(e)}",
                            })

                        except Exception as e:
                            logger.error(f"Tool execution error: {e}")
                            yield {
                                "type": "tool_result",
                                "data": {
                                    "tool": tool_name,
                                    "success": False,
                                    "error": "Operation could not be completed",
                                }
                            }
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{"id": tool_call_id, "type": "function", "function": {"name": tool_name, "arguments": json.dumps(tool_input)}}],
                            })
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": f"The {tool_name} operation could not be completed. Please inform the user that you encountered an issue and offer to try again or take an alternative approach. Do not show technical details.",
                            })

                    elif chunk_type == "stop":
                        # LLM finished
                        break

                    elif chunk_type == "error":
                        yield {
                            "type": "error",
                            "data": {"message": chunk.get("message", "Unknown error")}
                        }
                        break

                # Check if we should continue the loop
                # Only break if no NEW tool calls were made in this iteration
                # If tools were called, continue so LLM can process results and respond
                if len(tool_calls_made) == tool_calls_at_start:
                    break

        except Exception as e:
            logger.exception(f"Orchestrator error: {e}")
            yield {
                "type": "error",
                "data": {"message": f"An error occurred: {str(e)}"}
            }

        # 9. Save assistant message
        latency_ms = int((time.time() - start_time) * 1000)
        assistant_message_id = None

        if accumulated_content:
            assistant_message = await agent_repo.save_message(
                conversation_id=conversation_id,
                role="assistant",
                content=accumulated_content,
                tool_calls=tool_calls_made if tool_calls_made else None,
                model_used=selected_model,
                latency_ms=latency_ms,
            )
            assistant_message_id = assistant_message.get("id")

        # 10. Record metrics
        try:
            await agent_repo.record_metric(
                company_id=user_context.get("company_id", "unknown"),
                metric_type="conversation_latency",
                metric_value=latency_ms,
                user_id=user_context.get("user_id"),
                dimension_1=selected_model,
            )

            if tool_calls_made:
                await agent_repo.record_metric(
                    company_id=user_context.get("company_id", "unknown"),
                    metric_type="tool_calls",
                    metric_value=len(tool_calls_made),
                    user_id=user_context.get("user_id"),
                )
        except Exception as e:
            logger.warning(f"Failed to record metrics: {e}")

        # 11. Done
        yield {
            "type": "done",
            "data": {
                "conversation_id": conversation_id,
                "message_id": assistant_message_id,
                "latency_ms": latency_ms,
                "tool_calls": len(tool_calls_made),
            }
        }

    def _build_operation_summary(self, tool_name: str, tool_input: Dict[str, Any]) -> str:
        """Build a human-readable summary for the confirmation card title."""
        name = tool_input.get("name") or tool_input.get("title") or ""

        if tool_name == "create_task":
            summary = f"Create task '{name}'" if name else "Create task"
            if tool_input.get("priority"):
                summary += f" ({tool_input['priority']} priority)"
        elif tool_name == "create_issue":
            summary = f"Report issue '{name}'" if name else "Report issue"
            if tool_input.get("priority"):
                summary += f" ({tool_input['priority']} priority)"
        elif tool_name == "create_installment":
            amount = tool_input.get("amount", 0)
            summary = f"Create installment '{name}'" if name else "Create installment"
            if amount:
                summary += f" (${amount:,.2f})"
            if tool_input.get("due_date"):
                summary += f", due {tool_input['due_date']}"
        elif tool_name == "create_stage":
            summary = f"Add stage '{name}'" if name else "Add stage"
            if tool_input.get("planned_start_date") and tool_input.get("planned_end_date"):
                summary += f" ({tool_input['planned_start_date']} to {tool_input['planned_end_date']})"
        elif tool_name == "delete_task":
            summary = "Delete task"
        elif tool_name == "update_project_status":
            summary = f"Update project status to '{tool_input.get('status', '?')}'"
        elif tool_name == "update_payment_status":
            summary = f"Update payment status to '{tool_input.get('status', '?')}'"
        elif tool_name == "update_issue_status":
            summary = f"Update issue status to '{tool_input.get('status', '?')}'"
        elif tool_name == "update_installment":
            changes = []
            if tool_input.get("name"):
                changes.append(f"rename to '{tool_input['name']}'")
            if tool_input.get("amount"):
                changes.append(f"amount ${tool_input['amount']:,.2f}")
            if tool_input.get("status"):
                changes.append(f"status to '{tool_input['status']}'")
            if tool_input.get("next_milestone") is True:
                changes.append("mark as next milestone")
            if tool_input.get("due_date"):
                changes.append(f"due {tool_input['due_date']}")
            summary = f"Update installment: {', '.join(changes)}" if changes else "Update installment"
        else:
            summary = tool_name.replace("_", " ").title()

        return summary

    def _summarize_result(self, result: Dict[str, Any], max_length: int = 8000) -> str:
        """Summarize a tool result for inclusion in context.

        Increased from 2000 to 8000 to handle complex nested structures
        like materials-by-stage which can exceed 2000 chars easily.
        """
        import json

        try:
            result_str = json.dumps(result, indent=2, default=str)
            if len(result_str) > max_length:
                return result_str[:max_length] + "\n... (truncated - data continues)"
            return result_str
        except Exception:
            return str(result)[:max_length]


# Global instance
agent_orchestrator = AgentOrchestrator()
