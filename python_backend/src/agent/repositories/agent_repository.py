"""
Agent database repository for agent.* schema operations.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from src.database.connection import db_manager

logger = logging.getLogger(__name__)
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
            json.dumps(tool_input, default=str),
            safety_level,
            execution_status,
            confirmation_required,
            now,
        )

        return self._convert_to_camel_case(dict(row))

    async def get_tool_call(
        self,
        tool_call_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get a tool call record by ID."""
        query = "SELECT * FROM agent.tool_calls WHERE id = $1"
        row = await db_manager.execute_one(query, tool_call_id)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None

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
            params.append(json.dumps(tool_output, default=str))
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


    # ==================== Metric Events (Observability) ====================

    async def save_metric_event(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save a detailed metric event for observability."""
        import json

        query = """
            INSERT INTO agent.metric_events
            (event_type, user_id, company_id, conversation_id, event_data, created_at)
            VALUES ($1, $2, $3, $4::uuid, $5::jsonb, NOW())
            RETURNING id, event_type, created_at
        """

        row = await db_manager.execute_one(
            query,
            event_type,
            user_id,
            company_id,
            conversation_id,
            json.dumps(event_data, default=str),
        )

        return dict(row) if row else {}

    async def get_kpi_metrics(self, window: str = "24h") -> Dict[str, Any]:
        """Get aggregated KPI metrics for a time window."""
        interval_sql = {"24h": "24 hours", "7d": "7 days", "30d": "30 days"}.get(window, "24 hours")

        query = f"""
            SELECT
                COUNT(*) as total_interactions,
                AVG(CASE WHEN (event_data->>'tool_execution_success')::boolean
                    THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
                AVG((event_data->>'total_latency_ms')::numeric) as avg_latency_ms,
                AVG(CASE WHEN (event_data->>'asked_followup')::boolean
                    THEN 1.0 ELSE 0.0 END) * 100 as followup_rate,
                AVG(CASE WHEN event_data->>'error' IS NOT NULL AND event_data->>'error' != 'null'
                    THEN 1.0 ELSE 0.0 END) * 100 as error_rate
            FROM agent.metric_events
            WHERE event_type = 'agent_interaction'
                AND created_at >= NOW() - '{interval_sql}'::interval
        """

        row = await db_manager.execute_one(query)

        # Confirmation accept rate
        conf_query = f"""
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'confirmation_approved') as approved,
                COUNT(*) as total
            FROM agent.metric_events
            WHERE event_type IN ('confirmation_approved', 'confirmation_rejected')
                AND created_at >= NOW() - '{interval_sql}'::interval
        """
        conf_row = await db_manager.execute_one(conf_query)

        total = row["total_interactions"] if row else 0
        conf_total = conf_row["total"] if conf_row else 0
        conf_approved = conf_row["approved"] if conf_row else 0

        return {
            "total_interactions": total,
            "success_rate": round(float(row["success_rate"] or 0), 1) if row else 0,
            "avg_latency_ms": round(float(row["avg_latency_ms"] or 0), 0) if row else 0,
            "followup_rate": round(float(row["followup_rate"] or 0), 1) if row else 0,
            "error_rate": round(float(row["error_rate"] or 0), 1) if row else 0,
            "confirm_accept_rate": round(conf_approved / conf_total * 100, 1) if conf_total > 0 else 0,
            "cost_per_interaction": 0,  # TODO: calculate from token usage
            "window": window,
        }

    async def get_router_metrics(self, window: str = "7d") -> Dict[str, Any]:
        """Get router performance metrics grouped by tier."""
        interval_sql = {"7d": "7 days", "30d": "30 days"}.get(window, "7 days")

        query = f"""
            SELECT
                event_data->>'router_complexity_class' as tier,
                COUNT(*) as count,
                AVG((event_data->>'total_latency_ms')::numeric) as avg_latency_ms,
                AVG(CASE WHEN event_data->>'error' IS NOT NULL AND event_data->>'error' != 'null'
                    THEN 1.0 ELSE 0.0 END) * 100 as error_rate
            FROM agent.metric_events
            WHERE event_type = 'agent_interaction'
                AND created_at >= NOW() - '{interval_sql}'::interval
            GROUP BY event_data->>'router_complexity_class'
        """

        rows = await db_manager.execute_query(query)
        total = sum(r["count"] for r in rows) if rows else 0

        distribution = []
        for row in (rows or []):
            distribution.append({
                "tier": row["tier"] or "unknown",
                "count": row["count"],
                "percentage": round(row["count"] / total * 100, 1) if total > 0 else 0,
                "avg_latency_ms": round(float(row["avg_latency_ms"] or 0), 0),
                "error_rate": round(float(row["error_rate"] or 0), 1),
                "estimated_cost": 0,
            })

        return {
            "distribution": distribution,
            "daily_cost": [],
            "recent_misroutes": [],
            "window": window,
        }

    async def get_tool_heatmap(self, window: str = "7d") -> Dict[str, Any]:
        """Get tool performance heatmap data."""
        interval_sql = {"7d": "7 days", "30d": "30 days"}.get(window, "7 days")

        query = f"""
            SELECT
                tool_elem as tool_name,
                COUNT(*) as total_calls,
                AVG(CASE WHEN (event_data->>'tool_execution_success')::boolean
                    THEN 1.0 ELSE 0.0 END) * 100 as success_rate
            FROM agent.metric_events,
                jsonb_array_elements_text(
                    CASE WHEN jsonb_typeof(event_data->'tools_selected') = 'array'
                    THEN event_data->'tools_selected' ELSE '[]'::jsonb END
                ) as tool_elem
            WHERE event_type = 'agent_interaction'
                AND created_at >= NOW() - '{interval_sql}'::interval
            GROUP BY tool_elem
        """

        rows = await db_manager.execute_query(query)

        tools = {}
        for row in (rows or []):
            tools[row["tool_name"]] = {
                "total_calls": row["total_calls"],
                "success_rate": round(float(row["success_rate"] or 0), 1),
                "rejection_rate": 0,
                "edit_rate": 0,
                "error_rate": round(100 - float(row["success_rate"] or 0), 1),
            }

        return {
            "tools": tools,
            "top_edited_params": [],
            "window": window,
        }

    async def get_recent_interactions(
        self, limit: int = 50, offset: int = 0
    ) -> Dict[str, Any]:
        """Get recent agent interactions for the timeline view."""
        count_query = """
            SELECT COUNT(*) as total
            FROM agent.metric_events
            WHERE event_type = 'agent_interaction'
        """
        count_row = await db_manager.execute_one(count_query)
        total = count_row["total"] if count_row else 0

        query = """
            SELECT id, event_data, created_at
            FROM agent.metric_events
            WHERE event_type = 'agent_interaction'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """

        rows = await db_manager.execute_query(query, limit, offset)

        interactions = []
        for row in (rows or []):
            data = row["event_data"] if isinstance(row["event_data"], dict) else {}
            interactions.append({
                "id": str(row["id"]),
                "timestamp": row["created_at"].isoformat() if row["created_at"] else None,
                "prompt_preview": (data.get("user_prompt", ""))[:100],
                "tools_called": data.get("tools_selected", []),
                "model_used": data.get("router_model_selected", ""),
                "success": data.get("tool_execution_success", True),
                "latency_ms": data.get("total_latency_ms", 0),
                "is_retry": False,
                "user_id": data.get("user_id", ""),
                "conversation_id": str(data.get("conversation_id", "")),
            })

        return {
            "interactions": interactions,
            "total": total,
            "limit": limit,
            "offset": offset,
        }


    # ==================== Troubleshooting (Root Admin) ====================

    async def get_failed_tool_calls(
        self,
        limit: int = 50,
        offset: int = 0,
        tool_name_filter: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get failed tool calls with user info for troubleshooting (root admin)."""
        conditions = ["tc.execution_status = 'failed'"]
        params: list = []
        param_idx = 1

        if tool_name_filter:
            conditions.append(f"tc.tool_name = ${param_idx}")
            params.append(tool_name_filter)
            param_idx += 1

        if start_date:
            conditions.append(f"tc.created_at >= ${param_idx}::timestamptz")
            params.append(start_date)
            param_idx += 1

        if end_date:
            conditions.append(f"tc.created_at <= ${param_idx}::timestamptz")
            params.append(end_date)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        count_query = f"""
            SELECT COUNT(*) as total
            FROM agent.tool_calls tc
            WHERE {where_clause}
        """
        count_row = await db_manager.execute_one(count_query, *params)
        total = count_row["total"] if count_row else 0

        query = f"""
            SELECT tc.id, tc.tool_name, tc.tool_input, tc.error_message,
                   tc.execution_time_ms, tc.conversation_id, tc.created_at,
                   u.first_name, u.last_name, u.email,
                   c.company_id
            FROM agent.tool_calls tc
            LEFT JOIN public.users u ON tc.user_id = u.id
            LEFT JOIN agent.conversations c ON tc.conversation_id = c.id
            WHERE {where_clause}
            ORDER BY tc.created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        rows = await db_manager.execute_query(query, *params)
        items = []
        for row in (rows or []):
            items.append({
                "id": str(row["id"]),
                "toolName": row["tool_name"],
                "toolInput": row["tool_input"] if isinstance(row["tool_input"], dict) else {},
                "errorMessage": row["error_message"],
                "executionTimeMs": row["execution_time_ms"],
                "conversationId": str(row["conversation_id"]) if row["conversation_id"] else None,
                "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
                "userName": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or "Unknown",
                "userEmail": row["email"],
            })

        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def get_failed_interactions(
        self,
        limit: int = 50,
        offset: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get agent interactions that had errors (root admin)."""
        conditions = [
            "event_type = 'agent_interaction'",
            "(event_data->>'error' IS NOT NULL AND event_data->>'error' != 'null' AND event_data->>'error' != '')"
        ]
        params: list = []
        param_idx = 1

        if start_date:
            conditions.append(f"created_at >= ${param_idx}::timestamptz")
            params.append(start_date)
            param_idx += 1

        if end_date:
            conditions.append(f"created_at <= ${param_idx}::timestamptz")
            params.append(end_date)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        count_query = f"""
            SELECT COUNT(*) as total
            FROM agent.metric_events
            WHERE {where_clause}
        """
        count_row = await db_manager.execute_one(count_query, *params)
        total = count_row["total"] if count_row else 0

        query = f"""
            SELECT id, event_data, user_id, company_id, conversation_id, created_at
            FROM agent.metric_events
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        rows = await db_manager.execute_query(query, *params)
        items = []
        for row in (rows or []):
            data = row["event_data"] if isinstance(row["event_data"], dict) else {}
            items.append({
                "id": str(row["id"]),
                "userPrompt": (data.get("user_prompt", ""))[:500],
                "error": data.get("error", ""),
                "toolsSelected": data.get("tools_selected", []),
                "modelUsed": data.get("router_model_selected", ""),
                "latencyMs": data.get("total_latency_ms", 0),
                "userId": row["user_id"],
                "conversationId": str(row["conversation_id"]) if row["conversation_id"] else None,
                "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
            })

        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def get_all_feedback(
        self,
        limit: int = 50,
        offset: int = 0,
        is_positive_filter: Optional[bool] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get all feedback across all companies (root admin)."""
        conditions: list = []
        params: list = []
        param_idx = 1

        if is_positive_filter is not None:
            conditions.append(f"f.is_positive = ${param_idx}")
            params.append(is_positive_filter)
            param_idx += 1

        if start_date:
            conditions.append(f"f.created_at >= ${param_idx}::timestamptz")
            params.append(start_date)
            param_idx += 1

        if end_date:
            conditions.append(f"f.created_at <= ${param_idx}::timestamptz")
            params.append(end_date)
            param_idx += 1

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        count_query = f"""
            SELECT COUNT(*) as total
            FROM agent.feedback f
            {where_clause}
        """
        count_row = await db_manager.execute_one(count_query, *params)
        total = count_row["total"] if count_row else 0

        query = f"""
            SELECT f.id, f.is_positive, f.user_query, f.assistant_response,
                   f.notes, f.tool_calls_used, f.created_at, f.conversation_id,
                   u.first_name, u.last_name, u.email,
                   co.name as company_name
            FROM agent.feedback f
            LEFT JOIN public.users u ON f.user_id = u.id
            LEFT JOIN public.companies co ON f.company_id = co.id
            {where_clause}
            ORDER BY f.created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        rows = await db_manager.execute_query(query, *params)
        items = []
        for row in (rows or []):
            items.append({
                "id": str(row["id"]),
                "isPositive": row["is_positive"],
                "userQuery": row["user_query"],
                "assistantResponse": (row["assistant_response"] or "")[:500],
                "notes": row["notes"],
                "toolCallsUsed": row["tool_calls_used"] if isinstance(row["tool_calls_used"], list) else [],
                "conversationId": str(row["conversation_id"]) if row["conversation_id"] else None,
                "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
                "userName": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or "Unknown",
                "userEmail": row["email"],
                "companyName": row["company_name"],
            })

        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def get_troubleshooting_summary(self, window: str = "24h") -> Dict[str, Any]:
        """Get aggregated troubleshooting summary for a time window (root admin)."""
        interval_sql = {"24h": "24 hours", "7d": "7 days", "30d": "30 days"}.get(window, "24 hours")

        # Each query wrapped in try/except so one failure doesn't crash the whole summary
        failed_tools_row = None
        try:
            failed_tools_query = f"""
                SELECT COUNT(*) as count
                FROM agent.tool_calls
                WHERE execution_status = 'failed'
                    AND created_at >= NOW() - '{interval_sql}'::interval
            """
            failed_tools_row = await db_manager.execute_one(failed_tools_query)
        except Exception as e:
            logger.warning(f"Troubleshooting summary - failed tools query error: {e}")

        error_interactions_row = None
        try:
            error_interactions_query = f"""
                SELECT COUNT(*) as count
                FROM agent.metric_events
                WHERE event_type = 'agent_interaction'
                    AND (event_data->>'error' IS NOT NULL AND event_data->>'error' != 'null' AND event_data->>'error' != '')
                    AND created_at >= NOW() - '{interval_sql}'::interval
            """
            error_interactions_row = await db_manager.execute_one(error_interactions_query)
        except Exception as e:
            logger.warning(f"Troubleshooting summary - error interactions query error: {e}")

        feedback_row = None
        try:
            feedback_query = f"""
                SELECT
                    SUM(CASE WHEN is_positive THEN 1 ELSE 0 END) as positive_count,
                    SUM(CASE WHEN NOT is_positive THEN 1 ELSE 0 END) as negative_count
                FROM agent.feedback
                WHERE created_at >= NOW() - '{interval_sql}'::interval
            """
            feedback_row = await db_manager.execute_one(feedback_query)
        except Exception as e:
            logger.warning(f"Troubleshooting summary - feedback query error: {e}")

        top_failing_row = None
        try:
            top_failing_query = f"""
                SELECT tool_name, COUNT(*) as fail_count
                FROM agent.tool_calls
                WHERE execution_status = 'failed'
                    AND created_at >= NOW() - '{interval_sql}'::interval
                GROUP BY tool_name
                ORDER BY fail_count DESC
                LIMIT 1
            """
            top_failing_row = await db_manager.execute_one(top_failing_query)
        except Exception as e:
            logger.warning(f"Troubleshooting summary - top failing tool query error: {e}")

        trend_rows = None
        try:
            trend_query = f"""
                SELECT DATE(created_at) as day, COUNT(*) as count
                FROM agent.tool_calls
                WHERE execution_status = 'failed'
                    AND created_at >= NOW() - '{interval_sql}'::interval
                GROUP BY DATE(created_at)
                ORDER BY day
            """
            trend_rows = await db_manager.execute_query(trend_query)
        except Exception as e:
            logger.warning(f"Troubleshooting summary - daily trend query error: {e}")

        return {
            "failedToolCalls": failed_tools_row["count"] if failed_tools_row else 0,
            "errorInteractions": error_interactions_row["count"] if error_interactions_row else 0,
            "positiveFeedback": int(feedback_row["positive_count"] or 0) if feedback_row else 0,
            "negativeFeedback": int(feedback_row["negative_count"] or 0) if feedback_row else 0,
            "topFailingTool": {
                "name": top_failing_row["tool_name"],
                "count": top_failing_row["fail_count"],
            } if top_failing_row else None,
            "dailyErrorTrend": [
                {"day": row["day"].isoformat(), "count": row["count"]}
                for row in (trend_rows or [])
            ],
            "window": window,
        }

    async def get_unread_error_count(self, since: Optional[str] = None) -> int:
        """Get count of agent errors since a given timestamp (for sidebar badge)."""
        if since:
            query = """
                SELECT COUNT(*) as count
                FROM agent.metric_events
                WHERE event_type = 'agent_error'
                    AND created_at >= $1::timestamptz
            """
            row = await db_manager.execute_one(query, since)
        else:
            query = """
                SELECT COUNT(*) as count
                FROM agent.metric_events
                WHERE event_type = 'agent_error'
                    AND created_at >= NOW() - interval '24 hours'
            """
            row = await db_manager.execute_one(query)
        return row["count"] if row else 0

    async def get_root_user_ids(self) -> List[str]:
        """Get all active root user IDs."""
        query = """
            SELECT id FROM public.users
            WHERE is_root = true AND is_active = true
        """
        rows = await db_manager.execute_query(query)
        return [row["id"] for row in (rows or [])]


# Global singleton instance
agent_repo = AgentRepository()
