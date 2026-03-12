"""
Agent chat API endpoint with SSE streaming.
"""

import json
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..core.orchestrator import agent_orchestrator
from ..core.context_builder import context_builder
from ..repositories.agent_repository import agent_repo
from src.api.auth import get_current_user_dependency

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent"])


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    conversation_id: Optional[str] = Field(
        None,
        description="Existing conversation ID. If null, creates a new conversation."
    )
    project_id: Optional[str] = Field(
        None,
        description="Optional project context for the conversation."
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The user's message to the agent."
    )
    language: Optional[str] = Field(
        "en",
        description="UI language code (e.g., 'en', 'es'). Agent responds in this language."
    )


class ConversationListItem(BaseModel):
    """Response model for conversation list items."""
    id: str
    title: Optional[str]
    projectId: Optional[str]
    status: str
    createdAt: str
    updatedAt: str


class ConfirmationAction(BaseModel):
    """Request model for confirmation actions."""
    confirmation_id: str
    action: str = Field(..., pattern="^(confirm|reject)$")
    notes: Optional[str] = None
    modified_params: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional modified parameters from the editable confirmation card."
    )


class FeedbackRequest(BaseModel):
    """Request model for feedback submission."""
    message_id: str = Field(..., description="ID of the assistant message being rated")
    conversation_id: str = Field(..., description="ID of the conversation")
    is_positive: bool = Field(..., description="True for thumbs up, False for thumbs down")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional feedback notes")


async def generate_sse_response(
    message: str,
    conversation_id: Optional[str],
    project_id: Optional[str],
    user_context: Dict[str, Any],
    language: str = "en",
):
    """Generate SSE response stream from orchestrator."""
    try:
        async for event in agent_orchestrator.process_message(
            message=message,
            conversation_id=conversation_id,
            project_id=project_id,
            user_context=user_context,
            language=language,
        ):
            event_type = event.get("type", "message")
            event_data = event.get("data", {})

            # Format as SSE (use default=str to handle UUIDs and other non-serializable types)
            yield f"event: {event_type}\n"
            yield f"data: {json.dumps(event_data, default=str)}\n\n"

    except Exception as e:
        logger.exception(f"SSE generation error: {e}")
        yield f"event: error\n"
        yield f"data: {json.dumps({'message': str(e)})}\n\n"


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Chat with the AI agent using Server-Sent Events (SSE).

    This endpoint streams responses in real-time as the agent processes
    the request, executes tools, and generates responses.

    Event types:
    - content: Text content chunks
    - tool_start: Tool execution started
    - tool_result: Tool execution completed
    - confirmation_required: Operation needs user confirmation
    - error: An error occurred
    - done: Processing complete
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Build user context
    user_context = context_builder.build_user_context(current_user)

    # Check if client role is trying to use agent (disabled per PRD section 11)
    if user_context.get("role") == "client":
        raise HTTPException(
            status_code=403,
            detail="Agent chat is not available for client users"
        )

    return StreamingResponse(
        generate_sse_response(
            message=request.message,
            conversation_id=request.conversation_id,
            project_id=request.project_id,
            user_context=user_context,
            language=request.language or "en",
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/conversations")
async def list_conversations(
    project_id: Optional[str] = None,
    status: str = "active",
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """List conversations for the current user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    conversations = await agent_repo.get_user_conversations(
        user_id=user_context["user_id"],
        company_id=user_context.get("company_id"),
        project_id=project_id,
        status=status,
        limit=limit,
        offset=offset,
    )

    return {
        "conversations": conversations,
        "count": len(conversations),
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Get a specific conversation with messages."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    conversation = await agent_repo.get_conversation(
        conversation_id=conversation_id,
        company_id=user_context.get("company_id"),
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Verify user owns the conversation
    if conversation.get("userId") != user_context["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get messages
    messages = await agent_repo.get_conversation_messages(
        conversation_id=conversation_id,
        limit=100,
    )

    return {
        "conversation": conversation,
        "messages": messages,
    }


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    title: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Update a conversation (title, status)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    # Verify conversation exists and user owns it
    conversation = await agent_repo.get_conversation(
        conversation_id=conversation_id,
        company_id=user_context.get("company_id"),
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.get("userId") != user_context["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update
    updated = await agent_repo.update_conversation(
        conversation_id=conversation_id,
        title=title,
        status=status,
    )

    return updated


@router.post("/confirm")
async def process_confirmation(
    request: ConfirmationAction,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Process a confirmation action (confirm or reject a pending operation).

    If action is 'confirm', executes the tool with the original (or modified) params
    and returns the result.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    # Get the pending confirmation
    confirmation = await agent_repo.get_pending_confirmation(
        request.confirmation_id
    )

    if not confirmation:
        raise HTTPException(status_code=404, detail="Confirmation not found")

    # Verify user owns this confirmation
    if confirmation.get("userId") != user_context["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if already processed
    if confirmation.get("status") != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Confirmation already {confirmation['status']}"
        )

    # Update confirmation status
    updated = await agent_repo.update_confirmation_status(
        confirmation_id=request.confirmation_id,
        status="confirmed" if request.action == "confirm" else "rejected",
        confirmed_by=user_context["user_id"],
    )

    result = None

    if request.action == "confirm":
        # Get the tool call to retrieve tool_input
        tool_call = await agent_repo.get_tool_call(confirmation["toolCallId"])

        if tool_call:
            tool_name = tool_call["toolName"]
            tool_input = tool_call["toolInput"]
            if isinstance(tool_input, str):
                tool_input = json.loads(tool_input)

            # Merge modified params over original if provided
            if request.modified_params:
                tool_input.update(request.modified_params)

            # Execute the tool
            try:
                from ..tools.executor import tool_executor

                exec_result = await tool_executor.execute(
                    tool_name=tool_name,
                    params=tool_input,
                    context=user_context,
                    message_id=tool_call["messageId"],
                    conversation_id=confirmation["conversationId"],
                )

                # Detect tool-level errors (returned as dicts, not exceptions)
                is_error = isinstance(exec_result, dict) and "error" in exec_result

                if is_error:
                    result = {"success": False, "error": exec_result["error"]}
                    result_message = exec_result.get("error", "Operation could not be completed.")
                    await agent_repo.update_tool_call(
                        tool_call["id"],
                        tool_output=exec_result,
                        execution_status="failed",
                    )
                else:
                    result = {"success": True, "result": exec_result}
                    result_message = exec_result.get("message", "Operation completed successfully.")
                    await agent_repo.update_tool_call(
                        tool_call["id"],
                        tool_output=exec_result,
                        execution_status="success",
                    )

                # Save assistant message with the result
                await agent_repo.save_message(
                    conversation_id=confirmation["conversationId"],
                    role="assistant",
                    content=result_message,
                )

                # Post-confirmation continuation: re-invoke the LLM so it can
                # chain additional tools (e.g., update_project_details for permit numbers)
                if not is_error:
                    try:
                        continuation_msg = (
                            f"[System: The {tool_name} action was confirmed and executed successfully. "
                            f"Result: {result_message}. "
                            f"Check the conversation history — if the user requested any additional "
                            f"actions (like adding custom fields, permit numbers, planning numbers, "
                            f"etc.), proceed with those now. Respond with a formatted summary of "
                            f"everything that was done, using <<double angle brackets>> for key details.]"
                        )

                        continuation_messages = []
                        async for event in agent_orchestrator.process_message(
                            message=continuation_msg,
                            conversation_id=confirmation["conversationId"],
                            project_id=None,
                            user_context=user_context,
                            language="en",
                        ):
                            event_type = event.get("type")
                            if event_type == "content":
                                continuation_messages.append(event["data"])
                            elif event_type == "error":
                                logger.warning(f"Continuation error event: {event.get('data')}")
                            elif event_type == "done":
                                break

                        if continuation_messages:
                            # The orchestrator already saved messages to DB;
                            # include the continuation text in the result
                            continuation_text = "".join(
                                chunk.get("content", "") if isinstance(chunk, dict) else str(chunk)
                                for chunk in continuation_messages
                            )
                            if continuation_text.strip():
                                result["continuation"] = continuation_text.strip()

                    except Exception as cont_err:
                        logger.warning(f"Post-confirmation continuation failed: {cont_err}")

            except Exception as e:
                logger.error(f"Tool execution after confirmation failed: {e}")
                result = {"success": False, "error": str(e)}

                await agent_repo.update_tool_call(
                    tool_call["id"],
                    execution_status="failed",
                    error_message=str(e),
                )

    # Log confirmation event for observability
    try:
        confirmation_event = {
            "tool_name": confirmation.get("toolName"),
            "user_id": user_context["user_id"],
            "company_id": user_context.get("company_id"),
            "conversation_id": confirmation.get("conversationId"),
            "edits_made": request.modified_params is not None,
            "edit_fields": list(request.modified_params.keys()) if request.modified_params else [],
        }
        event_type = "confirmation_approved" if request.action == "confirm" else "confirmation_rejected"
        await agent_repo.save_metric_event(
            event_type=event_type,
            event_data=confirmation_event,
            user_id=user_context["user_id"],
            company_id=user_context.get("company_id"),
            conversation_id=confirmation.get("conversationId"),
        )
    except Exception as e:
        logger.warning(f"Failed to save confirmation event: {e}")

    return {
        "confirmation": updated,
        "action": request.action,
        "result": result,
    }


@router.get("/pending-confirmations")
async def list_pending_confirmations(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """List pending confirmations for the current user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    confirmations = await agent_repo.get_user_pending_confirmations(
        user_id=user_context["user_id"],
    )

    return {
        "confirmations": confirmations,
        "count": len(confirmations),
    }


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Submit feedback on an agent response (thumbs up/down with optional notes).

    This feedback is stored with the original query and response for future learning.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    # Get the conversation to verify access
    conversation = await agent_repo.get_conversation(
        conversation_id=request.conversation_id,
        company_id=user_context.get("company_id"),
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get the message being rated and the preceding user query
    messages = await agent_repo.get_conversation_messages(
        conversation_id=request.conversation_id,
        limit=50,
    )

    # Find the assistant message and the preceding user query
    assistant_response = None
    user_query = None

    for i, msg in enumerate(messages):
        if msg.get("id") == request.message_id:
            if msg.get("role") != "assistant":
                raise HTTPException(
                    status_code=400,
                    detail="Can only rate assistant messages"
                )
            assistant_response = msg.get("content", "")
            # Find the preceding user message
            for j in range(i - 1, -1, -1):
                if messages[j].get("role") == "user":
                    user_query = messages[j].get("content", "")
                    break
            break

    if not assistant_response:
        raise HTTPException(status_code=404, detail="Message not found")

    if not user_query:
        user_query = "(No user query found)"

    # Get tool calls from the message if available
    tool_calls_used = None
    for msg in messages:
        if msg.get("id") == request.message_id:
            tool_calls_used = msg.get("toolCalls")
            break

    # Save feedback
    feedback = await agent_repo.save_feedback(
        message_id=request.message_id,
        conversation_id=request.conversation_id,
        user_id=user_context["user_id"],
        company_id=user_context["company_id"],
        is_positive=request.is_positive,
        user_query=user_query,
        assistant_response=assistant_response,
        notes=request.notes,
        tool_calls_used=tool_calls_used,
    )

    return {
        "feedback": feedback,
        "message": "Thank you for your feedback!"
    }


@router.get("/feedback/stats")
async def get_feedback_stats(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Get feedback statistics for the company (admin only)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_context = context_builder.build_user_context(current_user)

    # Only admin can view feedback stats
    if user_context.get("role") not in ("admin", "project_manager"):
        raise HTTPException(status_code=403, detail="Admin access required")

    stats = await agent_repo.get_feedback_stats(
        company_id=user_context["company_id"],
    )

    return stats
