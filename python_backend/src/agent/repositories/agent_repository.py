"""
Agent database repository for agent.* schema operations.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from src.database.connection import db_manager
from src.utils.data_conversion import to_camel_case


class AgentRepository:
    """Repository for agent database operations."""

    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data

    # ==================== Conversations ====================

    async def create_conversation(
        self,
        user_id: str,
        company_id: str,
        project_id: Optional[str] = None,
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new conversation session."""
        conversation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO agent.conversations
            (id, user_id, company_id, project_id, title, status, metadata, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $7)
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            conversation_id,
            user_id,
            company_id,
            project_id,
            title,
            json.dumps(metadata) if metadata else '{}',
            now,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_conversation(
        self,
        conversation_id: str,
        company_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID with optional company filtering."""
        if company_id:
            query = """
                SELECT * FROM agent.conversations
                WHERE id = $1 AND company_id = $2
            """
            row = await db_manager.execute_one(query, conversation_id, company_id)
        else:
            query = "SELECT * FROM agent.conversations WHERE id = $1"
            row = await db_manager.execute_one(query, conversation_id)

        if row:
            return self._convert_to_camel_case(dict(row))
        return None

    async def get_user_conversations(
        self,
        user_id: str,
        company_id: Optional[str] = None,
        project_id: Optional[str] = None,
        status: str = "active",
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get conversations for a user with optional filters."""
        conditions = ["user_id = $1", "status = $2"]
        params = [user_id, status]
        param_idx = 3

        if company_id:
            conditions.append(f"company_id = ${param_idx}")
            params.append(company_id)
            param_idx += 1

        if project_id:
            conditions.append(f"project_id = ${param_idx}")
            params.append(project_id)
            param_idx += 1

        query = f"""
            SELECT * FROM agent.conversations
            WHERE {' AND '.join(conditions)}
            ORDER BY updated_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        rows = await db_manager.execute_query(query, *params)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    async def update_conversation(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        status: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update a conversation."""
        updates = []
        params = []
        param_idx = 1

        if title is not None:
            updates.append(f"title = ${param_idx}")
            params.append(title)
            param_idx += 1

        if status is not None:
            updates.append(f"status = ${param_idx}")
            params.append(status)
            param_idx += 1

        if metadata is not None:
            updates.append(f"metadata = ${param_idx}")
            params.append(json.dumps(metadata))
            param_idx += 1

        if not updates:
            return await self.get_conversation(conversation_id)

        updates.append("updated_at = NOW()")

        query = f"""
            UPDATE agent.conversations
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            RETURNING *
        """
        params.append(conversation_id)

        row = await db_manager.execute_one(query, *params)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None

    # ==================== Messages ====================

    async def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        tool_results: Optional[List[Dict[str, Any]]] = None,
        model_used: Optional[str] = None,
        token_count: Optional[int] = None,
        latency_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Save a message to a conversation."""
        message_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO agent.messages
            (id, conversation_id, role, content, tool_calls, tool_results,
             model_used, token_count, latency_ms, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            message_id,
            conversation_id,
            role,
            content,
            json.dumps(tool_calls) if tool_calls else None,
            json.dumps(tool_results) if tool_results else None,
            model_used,
            token_count,
            latency_ms,
            now,
        )

        # Update conversation's updated_at
        await db_manager.execute(
            "UPDATE agent.conversations SET updated_at = NOW() WHERE id = $1",
            conversation_id,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_conversation_messages(
        self,
        conversation_id: str,
        limit: int = 30,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation."""
        query = """
            SELECT * FROM agent.messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            LIMIT $2 OFFSET $3
        """

        rows = await db_manager.execute_query(query, conversation_id, limit, offset)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    async def get_messages_for_llm(
        self,
        conversation_id: str,
        limit: int = 30,
    ) -> List[Dict[str, str]]:
        """Get messages formatted for LLM context (role + content only)."""
        messages = await self.get_conversation_messages(conversation_id, limit)

        llm_messages = []
        for msg in messages:
            # Skip system messages in history (they're added fresh each time)
            if msg["role"] == "system":
                continue

            llm_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        return llm_messages

    # ==================== Tool Calls ====================

    async def save_tool_call(
        self,
        message_id: str,
        conversation_id: str,
        user_id: str,
        tool_name: str,
        tool_input: Dict[str, Any],
        safety_level: str,
        project_id: Optional[str] = None,
        execution_status: str = "pending",
        confirmation_required: bool = False,
    ) -> Dict[str, Any]:
        """Save a tool call record."""
        tool_call_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO agent.tool_calls
            (id, message_id, conversation_id, user_id, project_id, tool_name,
             tool_input, safety_level, execution_status, confirmation_required, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            tool_call_id,
            message_id,
            conversation_id,
            user_id,
            project_id,
            tool_name,
            json.dumps(tool_input),
            safety_level,
            execution_status,
            confirmation_required,
            now,
        )

        return self._convert_to_camel_case(dict(row))

    async def update_tool_call(
        self,
        tool_call_id: str,
        tool_output: Optional[Dict[str, Any]] = None,
        execution_status: Optional[str] = None,
        error_message: Optional[str] = None,
        execution_time_ms: Optional[int] = None,
        confirmed_by: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update a tool call record."""
        updates = []
        params = []
        param_idx = 1

        if tool_output is not None:
            updates.append(f"tool_output = ${param_idx}")
            params.append(json.dumps(tool_output))
            param_idx += 1

        if execution_status is not None:
            updates.append(f"execution_status = ${param_idx}")
            params.append(execution_status)
            param_idx += 1

        if error_message is not None:
            updates.append(f"error_message = ${param_idx}")
            params.append(error_message)
            param_idx += 1

        if execution_time_ms is not None:
            updates.append(f"execution_time_ms = ${param_idx}")
            params.append(execution_time_ms)
            param_idx += 1

        if confirmed_by is not None:
            updates.append(f"confirmed_by = ${param_idx}")
            params.append(confirmed_by)
            param_idx += 1
            updates.append("confirmed_at = NOW()")

        if not updates:
            return None

        query = f"""
            UPDATE agent.tool_calls
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            RETURNING *
        """
        params.append(tool_call_id)

        row = await db_manager.execute_one(query, *params)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None

    async def get_tool_calls(
        self,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get tool calls with optional filters."""
        conditions = []
        params = []
        param_idx = 1

        if conversation_id:
            conditions.append(f"conversation_id = ${param_idx}")
            params.append(conversation_id)
            param_idx += 1

        if user_id:
            conditions.append(f"user_id = ${param_idx}")
            params.append(user_id)
            param_idx += 1

        if tool_name:
            conditions.append(f"tool_name = ${param_idx}")
            params.append(tool_name)
            param_idx += 1

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        query = f"""
            SELECT * FROM agent.tool_calls
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_idx}
        """
        params.append(limit)

        rows = await db_manager.execute_query(query, *params)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    # ==================== Pending Confirmations ====================

    async def create_pending_confirmation(
        self,
        tool_call_id: str,
        conversation_id: str,
        user_id: str,
        tool_name: str,
        operation_summary: str,
        impact_assessment: Optional[str] = None,
        timeout_minutes: int = 30,
    ) -> Dict[str, Any]:
        """Create a pending confirmation request."""
        confirmation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=timeout_minutes)

        query = """
            INSERT INTO agent.pending_confirmations
            (id, tool_call_id, conversation_id, user_id, tool_name,
             operation_summary, impact_assessment, expires_at, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            confirmation_id,
            tool_call_id,
            conversation_id,
            user_id,
            tool_name,
            operation_summary,
            impact_assessment,
            expires_at,
            now,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_pending_confirmation(
        self,
        confirmation_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get a pending confirmation by ID."""
        query = "SELECT * FROM agent.pending_confirmations WHERE id = $1"
        row = await db_manager.execute_one(query, confirmation_id)

        if row:
            return self._convert_to_camel_case(dict(row))
        return None

    async def update_confirmation_status(
        self,
        confirmation_id: str,
        status: str,
        confirmed_by: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update the status of a pending confirmation."""
        query = """
            UPDATE agent.pending_confirmations
            SET status = $1
            WHERE id = $2
            RETURNING *
        """

        row = await db_manager.execute_one(query, status, confirmation_id)

        # Also update the related tool call if confirmed
        if row and status == "confirmed" and confirmed_by:
            tool_call_id = row["tool_call_id"]
            await self.update_tool_call(
                tool_call_id,
                execution_status="confirmed",
                confirmed_by=confirmed_by,
            )

        if row:
            return self._convert_to_camel_case(dict(row))
        return None

    async def get_user_pending_confirmations(
        self,
        user_id: str,
    ) -> List[Dict[str, Any]]:
        """Get all pending confirmations for a user."""
        query = """
            SELECT * FROM agent.pending_confirmations
            WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()
            ORDER BY created_at DESC
        """

        rows = await db_manager.execute_query(query, user_id)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    async def expire_old_confirmations(self) -> int:
        """Expire old pending confirmations. Returns count of expired."""
        query = """
            UPDATE agent.pending_confirmations
            SET status = 'expired'
            WHERE status = 'pending' AND expires_at <= NOW()
        """

        result = await db_manager.execute(query)
        # asyncpg returns the command status like "UPDATE N"
        if result and isinstance(result, str):
            parts = result.split()
            if len(parts) == 2 and parts[0] == "UPDATE":
                return int(parts[1])
        return 0

    # ==================== Metrics ====================

    async def record_metric(
        self,
        company_id: str,
        metric_type: str,
        metric_value: float,
        user_id: Optional[str] = None,
        dimension_1: Optional[str] = None,
        dimension_2: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a metric for analytics."""
        query = """
            INSERT INTO agent.metrics
            (company_id, user_id, metric_type, metric_value, metric_date,
             dimension_1, dimension_2, created_at)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, NOW())
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            company_id,
            user_id,
            metric_type,
            metric_value,
            dimension_1,
            dimension_2,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_metrics(
        self,
        company_id: str,
        metric_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Get metrics for a company with optional filters."""
        conditions = ["company_id = $1"]
        params = [company_id]
        param_idx = 2

        if metric_type:
            conditions.append(f"metric_type = ${param_idx}")
            params.append(metric_type)
            param_idx += 1

        if start_date:
            conditions.append(f"metric_date >= ${param_idx}")
            params.append(start_date.date())
            param_idx += 1

        if end_date:
            conditions.append(f"metric_date <= ${param_idx}")
            params.append(end_date.date())
            param_idx += 1

        query = f"""
            SELECT * FROM agent.metrics
            WHERE {' AND '.join(conditions)}
            ORDER BY metric_date DESC, created_at DESC
        """

        rows = await db_manager.execute_query(query, *params)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    # ==================== Feedback ====================

    async def save_feedback(
        self,
        message_id: str,
        conversation_id: str,
        user_id: str,
        company_id: str,
        is_positive: bool,
        user_query: str,
        assistant_response: str,
        notes: Optional[str] = None,
        tool_calls_used: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Save user feedback on an agent response."""
        import json

        query = """
            INSERT INTO agent.feedback
            (message_id, conversation_id, user_id, company_id, is_positive,
             notes, user_query, assistant_response, tool_calls_used, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
        """

        row = await db_manager.execute_one(
            query,
            message_id,
            conversation_id,
            user_id,
            company_id,
            is_positive,
            notes,
            user_query,
            assistant_response,
            json.dumps(tool_calls_used) if tool_calls_used else None,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_feedback_by_company(
        self,
        company_id: str,
        limit: int = 100,
        is_positive: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Get feedback for a company with optional filters."""
        conditions = ["company_id = $1"]
        params = [company_id]
        param_idx = 2

        if is_positive is not None:
            conditions.append(f"is_positive = ${param_idx}")
            params.append(is_positive)
            param_idx += 1

        query = f"""
            SELECT * FROM agent.feedback
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC
            LIMIT ${param_idx}
        """
        params.append(limit)

        rows = await db_manager.execute_query(query, *params)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    async def get_feedback_stats(
        self,
        company_id: str,
    ) -> Dict[str, Any]:
        """Get feedback statistics for a company."""
        query = """
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_positive THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN NOT is_positive THEN 1 ELSE 0 END) as negative_count
            FROM agent.feedback
            WHERE company_id = $1
        """

        row = await db_manager.execute_one(query, company_id)
        if not row:
            return {"total": 0, "positiveCount": 0, "negativeCount": 0, "positiveRate": 0}

        total = row["total"] or 0
        positive = row["positive_count"] or 0
        negative = row["negative_count"] or 0

        return {
            "total": total,
            "positiveCount": positive,
            "negativeCount": negative,
            "positiveRate": round(positive / total * 100, 1) if total > 0 else 0,
        }


# Global singleton instance
agent_repo = AgentRepository()
