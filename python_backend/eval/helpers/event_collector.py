"""
Generalized event collector for agent orchestrator output.

Collects and structures all events from AgentOrchestrator.process_message()
for evaluation purposes.
"""

import time
from typing import Any, Dict, List, Optional

from src.agent.core.orchestrator import AgentOrchestrator


async def collect_events(
    agent: AgentOrchestrator,
    query: str,
    context: Dict[str, Any],
    conversation_id: Optional[str] = None,
    project_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Collect all events from an agent response.

    Args:
        agent: AgentOrchestrator instance.
        query: User message to send.
        context: User context dict (user_id, company_id, role, etc.).
        conversation_id: Optional conversation ID for multi-turn tests.
        project_id: Optional project ID for context-scoped tests.

    Returns:
        Dict with structured event data:
        - events: Raw event list
        - content: Accumulated text content
        - tools_used: List of tool names invoked
        - tool_inputs: List of dicts with tool name and input params
        - tool_results: List of dicts with tool name and result data
        - confirmations: List of confirmation_required event data
        - errors: List of error messages
        - has_error: Bool
        - has_confirmation: Bool
        - asked_question: Bool (heuristic: content contains '?' and no write tools called)
        - latency_ms: Total response time in milliseconds
        - conversation_id: Conversation ID used (may be auto-generated)
    """
    events: List[Dict[str, Any]] = []
    full_content = ""
    tools_used: List[str] = []
    tool_inputs: List[Dict[str, Any]] = []
    tool_results: List[Dict[str, Any]] = []
    errors: List[str] = []
    confirmations: List[Dict[str, Any]] = []
    result_conversation_id = conversation_id

    start_time = time.monotonic()

    async for event in agent.process_message(
        message=query,
        conversation_id=conversation_id,
        project_id=project_id,
        user_context=context,
    ):
        events.append(event)
        etype = event.get("type")
        data = event.get("data", {})

        if etype == "content":
            full_content += data.get("content", "")
        elif etype == "tool_start":
            tool_name = data.get("tool")
            tools_used.append(tool_name)
            tool_inputs.append({
                "tool": tool_name,
                "input": data.get("input", {}),
            })
        elif etype == "tool_result":
            tool_results.append({
                "tool": data.get("tool"),
                "result": data.get("result"),
                "success": data.get("success", True),
            })
        elif etype == "confirmation_required":
            confirmations.append(data)
            tool_name = data.get("tool") or data.get("tool_name")
            if tool_name:
                tools_used.append(tool_name)
            tool_inputs.append({
                "tool": tool_name,
                "input": data.get("proposed_params", data.get("input", {})),
            })
        elif etype == "error":
            errors.append(data.get("message", "Unknown error"))
        elif etype == "done":
            result_conversation_id = data.get("conversation_id", result_conversation_id)

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    # Filter None values from tools_used
    tools_used = [t for t in tools_used if t]

    # Heuristic: agent asked a question if content has '?' and no write tools were called
    READ_ONLY_TOOLS = {
        "get_projects", "get_project_detail", "get_stages", "get_tasks",
        "get_materials", "get_issues", "get_installments", "get_stage_templates",
        "query_database",
    }
    write_tools_used = [t for t in tools_used if t not in READ_ONLY_TOOLS]
    asked_question = "?" in full_content and len(write_tools_used) == 0

    return {
        "events": events,
        "content": full_content,
        "tools_used": tools_used,
        "tool_inputs": tool_inputs,
        "tool_results": tool_results,
        "confirmations": confirmations,
        "errors": errors,
        "has_error": len(errors) > 0,
        "has_confirmation": len(confirmations) > 0,
        "asked_question": asked_question,
        "latency_ms": elapsed_ms,
        "conversation_id": result_conversation_id,
    }
