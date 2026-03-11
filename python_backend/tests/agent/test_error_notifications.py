"""
Tests for agent error notification and troubleshooting system.

Verifies:
1. Error notifier saves metric events
2. PM notifications created for root users (with project_id)
3. PM notifications skipped without project_id
4. Rate limiting prevents notification spam
5. Sidebar unread error count endpoint
6. Bell notification includes agent_error type
7. Summary returns correct card data
8. Summary respects different time windows
9. Failed tools retrieval with camelCase formatting
10. Failed interactions retrieval
11. Feedback retrieval with is_positive filter
12. Feedback counts match summary
13. Unread error count with since parameter
14. Unread error count without since (24h default)
15. Bell notification created on error with project_id
16. Notification route path for agent_error
17. Full workflow: error → metric → summary cards → badge
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch, call

from src.agent.core.error_notifier import (
    notify_root_admins_on_error,
    _rate_limit_cache,
)
from src.agent.repositories.agent_repository import AgentRepository


# ==================== Helper ====================

def _mock_row(data: dict):
    """Create a mock DB row that supports dict-style access."""
    row = MagicMock()
    row.__getitem__ = lambda self, key: data[key]
    row.__contains__ = lambda self, key: key in data
    row.keys = lambda: data.keys()
    row.get = lambda key, default=None: data.get(key, default)
    return row


# ==================== Existing Tests (1-6) ====================

@pytest.mark.asyncio
async def test_error_notifier_saves_metric_event():
    """Error notifier always saves to agent.metric_events."""
    _rate_limit_cache.clear()

    with patch("src.agent.core.error_notifier.agent_repo") as mock_repo:
        mock_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_repo.get_root_user_ids = AsyncMock(return_value=[])

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Task creation failed: invalid date",
            tool_name="create_task",
            user_id="user-1",
            conversation_id="conv-1",
            project_id=None,
            company_id="company-1",
        )

        mock_repo.save_metric_event.assert_called_once()
        call_kwargs = mock_repo.save_metric_event.call_args
        assert call_kwargs.kwargs["event_type"] == "agent_error"
        event_data = call_kwargs.kwargs["event_data"]
        assert event_data["error_type"] == "tool_execution_error"
        assert event_data["tool_name"] == "create_task"
        assert "invalid date" in event_data["error_message"]
        assert call_kwargs.kwargs["user_id"] == "user-1"
        assert call_kwargs.kwargs["company_id"] == "company-1"


@pytest.mark.asyncio
async def test_error_notifier_creates_pm_notification_with_project_id():
    """When project_id is provided, PM notifications are created for each root user."""
    _rate_limit_cache.clear()

    mock_conn = AsyncMock()

    class MockAcquire:
        async def __aenter__(self):
            return mock_conn
        async def __aexit__(self, *args):
            pass

    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire()

    with patch("src.agent.core.error_notifier.agent_repo") as mock_repo, \
         patch("src.agent.core.error_notifier.get_db_pool", AsyncMock(return_value=mock_pool)):

        mock_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_repo.get_root_user_ids = AsyncMock(return_value=["root-1", "root-2"])

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Task creation failed",
            tool_name="create_task",
            user_id="user-1",
            conversation_id="conv-1",
            project_id="proj-123",
            company_id="company-1",
        )

        mock_repo.save_metric_event.assert_called_once()
        mock_repo.get_root_user_ids.assert_called_once()

        assert mock_conn.execute.call_count == 2
        for i, root_id in enumerate(["root-1", "root-2"]):
            call_args = mock_conn.execute.call_args_list[i]
            sql = call_args[0][0]
            assert "agent_error" in sql
            assert call_args[0][1] == "proj-123"
            assert call_args[0][2] == root_id


@pytest.mark.asyncio
async def test_error_notifier_skips_pm_notification_without_project_id():
    """Without project_id, only metric_event is saved (no PM notification)."""
    _rate_limit_cache.clear()

    with patch("src.agent.core.error_notifier.agent_repo") as mock_repo, \
         patch("src.agent.core.error_notifier.get_db_pool") as mock_get_pool:

        mock_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_repo.get_root_user_ids = AsyncMock(return_value=["root-1"])

        await notify_root_admins_on_error(
            error_type="llm_provider_error",
            error_message="API timeout",
            user_id="user-1",
            project_id=None,
        )

        mock_repo.save_metric_event.assert_called_once()
        mock_get_pool.assert_not_called()


@pytest.mark.asyncio
async def test_error_notifier_rate_limiting():
    """Same error key is rate-limited (only 1 notification per 5 min window)."""
    _rate_limit_cache.clear()

    with patch("src.agent.core.error_notifier.agent_repo") as mock_repo:
        mock_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_repo.get_root_user_ids = AsyncMock(return_value=[])

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Error 1",
            tool_name="create_task",
        )

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Error 2",
            tool_name="create_task",
        )

        assert mock_repo.save_metric_event.call_count == 1

    _rate_limit_cache.clear()


@pytest.mark.asyncio
async def test_sidebar_unread_error_count():
    """Sidebar badge endpoint returns correct unread error count."""
    with patch("src.api.agent_troubleshooting.agent_repo") as mock_repo:
        mock_repo.get_unread_error_count = AsyncMock(return_value=5)

        from src.api.agent_troubleshooting import get_unread_error_count

        result = await get_unread_error_count(
            since="2025-01-01T00:00:00Z",
            current_user={"id": "root-1", "is_root": True},
        )

        assert result == {"count": 5}
        mock_repo.get_unread_error_count.assert_called_once_with("2025-01-01T00:00:00Z")


@pytest.mark.asyncio
async def test_bell_includes_agent_error_notifications():
    """Bell notification unread count includes agent_error type (no type filter in SQL)."""
    from src.services.notification_service import NotificationService

    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.fetchrow = AsyncMock(return_value={"count": 3})
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    service = NotificationService(mock_pool)
    count = await service.unread_count("root-1")

    assert count == 3
    sql = mock_conn.fetchrow.call_args[0][0]
    assert "is_read = FALSE" in sql
    assert "type" not in sql.lower().split("where")[1]


# ==================== New Tests (7-17) ====================

@pytest.mark.asyncio
async def test_summary_returns_correct_card_data():
    """Summary endpoint returns correct counts for all 4 summary cards."""
    repo = AgentRepository()

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        # 5 execute_one calls (failed tools, error interactions, feedback, top failing)
        mock_db.execute_one = AsyncMock(side_effect=[
            _mock_row({"count": 3}),                                          # failed tools
            _mock_row({"count": 5}),                                          # error interactions
            _mock_row({"positive_count": 10, "negative_count": 2}),           # feedback
            _mock_row({"tool_name": "create_task", "fail_count": 3}),         # top failing
        ])
        # 1 execute_query call (daily trend)
        mock_db.execute_query = AsyncMock(return_value=[
            _mock_row({"day": datetime(2025, 1, 15).date(), "count": 2}),
        ])

        result = await repo.get_troubleshooting_summary("24h")

        assert result["failedToolCalls"] == 3
        assert result["errorInteractions"] == 5
        assert result["positiveFeedback"] == 10
        assert result["negativeFeedback"] == 2
        assert result["topFailingTool"]["name"] == "create_task"
        assert result["topFailingTool"]["count"] == 3
        assert len(result["dailyErrorTrend"]) == 1
        assert result["window"] == "24h"

        # Verify SQL uses inline interval, not $1 parameter
        first_call_sql = mock_db.execute_one.call_args_list[0][0][0]
        assert "'24 hours'::interval" in first_call_sql
        # No args passed (interval is inlined)
        assert len(mock_db.execute_one.call_args_list[0][0]) == 1


@pytest.mark.asyncio
async def test_summary_different_windows():
    """Different window values produce different interval SQL strings."""
    repo = AgentRepository()

    for window, expected_interval in [("7d", "7 days"), ("30d", "30 days")]:
        with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
            mock_db.execute_one = AsyncMock(side_effect=[
                _mock_row({"count": 0}),
                _mock_row({"count": 0}),
                _mock_row({"positive_count": 0, "negative_count": 0}),
                None,  # top failing returns None
            ])
            mock_db.execute_query = AsyncMock(return_value=[])

            result = await repo.get_troubleshooting_summary(window)

            assert result["window"] == window
            first_sql = mock_db.execute_one.call_args_list[0][0][0]
            assert f"'{expected_interval}'::interval" in first_sql


@pytest.mark.asyncio
async def test_failed_tools_retrieval():
    """Failed tool calls are returned with correct camelCase formatting."""
    repo = AgentRepository()
    now = datetime.now(timezone.utc)

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"total": 2}))
        mock_db.execute_query = AsyncMock(return_value=[
            _mock_row({
                "id": "tc-1",
                "tool_name": "create_task",
                "tool_input": {"task_name": "Test"},
                "error_message": "Invalid date format",
                "execution_time_ms": 150,
                "conversation_id": "conv-1",
                "created_at": now,
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@test.com",
                "company_id": "comp-1",
            }),
            _mock_row({
                "id": "tc-2",
                "tool_name": "update_stage",
                "tool_input": {"stage_id": "s1"},
                "error_message": "Stage not found",
                "execution_time_ms": 80,
                "conversation_id": "conv-2",
                "created_at": now,
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@test.com",
                "company_id": "comp-1",
            }),
        ])

        result = await repo.get_failed_tool_calls(limit=50, offset=0)

        assert result["total"] == 2
        assert len(result["items"]) == 2

        item = result["items"][0]
        assert item["toolName"] == "create_task"
        assert item["errorMessage"] == "Invalid date format"
        assert item["executionTimeMs"] == 150
        assert item["userName"] == "John Doe"
        assert item["userEmail"] == "john@test.com"
        assert "toolInput" in item
        assert item["toolInput"]["task_name"] == "Test"


@pytest.mark.asyncio
async def test_failed_interactions_retrieval():
    """Failed interactions are returned with correct field extraction from event_data."""
    repo = AgentRepository()
    now = datetime.now(timezone.utc)

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"total": 1}))
        mock_db.execute_query = AsyncMock(return_value=[
            _mock_row({
                "id": "evt-1",
                "event_data": {
                    "user_prompt": "Create a task for tomorrow",
                    "error": "LLM provider timeout after 30s",
                    "tools_selected": ["create_task"],
                    "router_model_selected": "openrouter/anthropic/claude-3.5-sonnet",
                    "total_latency_ms": 30500,
                },
                "user_id": "user-1",
                "company_id": "comp-1",
                "conversation_id": "conv-1",
                "created_at": now,
            }),
        ])

        result = await repo.get_failed_interactions(limit=50, offset=0)

        assert result["total"] == 1
        assert len(result["items"]) == 1

        item = result["items"][0]
        assert item["userPrompt"] == "Create a task for tomorrow"
        assert item["error"] == "LLM provider timeout after 30s"
        assert item["toolsSelected"] == ["create_task"]
        assert item["modelUsed"] == "openrouter/anthropic/claude-3.5-sonnet"
        assert item["latencyMs"] == 30500


@pytest.mark.asyncio
async def test_feedback_retrieval_with_filter():
    """Feedback filtered by is_positive returns correctly formatted results."""
    repo = AgentRepository()
    now = datetime.now(timezone.utc)

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"total": 1}))
        mock_db.execute_query = AsyncMock(return_value=[
            _mock_row({
                "id": "fb-1",
                "is_positive": True,
                "user_query": "Show me project status",
                "assistant_response": "Here is the status of your project Via Tesoro...",
                "notes": "Very helpful answer",
                "tool_calls_used": ["get_projects", "get_project_detail"],
                "created_at": now,
                "conversation_id": "conv-1",
                "first_name": "Alice",
                "last_name": "Builder",
                "email": "alice@test.com",
                "company_name": "Construction Co",
            }),
        ])

        result = await repo.get_all_feedback(
            limit=50, offset=0, is_positive_filter=True
        )

        assert result["total"] == 1
        item = result["items"][0]
        assert item["isPositive"] is True
        assert item["userQuery"] == "Show me project status"
        assert item["userName"] == "Alice Builder"
        assert item["companyName"] == "Construction Co"
        assert item["notes"] == "Very helpful answer"
        assert "get_projects" in item["toolCallsUsed"]

        # Verify the SQL includes is_positive filter
        query_sql = mock_db.execute_query.call_args[0][0]
        assert "is_positive" in query_sql


@pytest.mark.asyncio
async def test_feedback_counts_match_summary():
    """Feedback counts from summary are consistent with feedback list total."""
    repo = AgentRepository()

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        # Summary call
        mock_db.execute_one = AsyncMock(side_effect=[
            _mock_row({"count": 0}),
            _mock_row({"count": 0}),
            _mock_row({"positive_count": 3, "negative_count": 1}),
            None,
        ])
        mock_db.execute_query = AsyncMock(return_value=[])

        summary = await repo.get_troubleshooting_summary("24h")

    total_feedback_from_summary = summary["positiveFeedback"] + summary["negativeFeedback"]

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        # Feedback list call — total should match
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"total": 4}))
        mock_db.execute_query = AsyncMock(return_value=[])

        feedback_result = await repo.get_all_feedback(limit=50, offset=0)

    assert total_feedback_from_summary == feedback_result["total"]


@pytest.mark.asyncio
async def test_unread_error_count_with_since():
    """Unread error count with since parameter uses timestamptz filter."""
    repo = AgentRepository()

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"count": 7}))

        count = await repo.get_unread_error_count(since="2025-01-15T00:00:00Z")

        assert count == 7
        call_args = mock_db.execute_one.call_args
        sql = call_args[0][0]
        assert "$1::timestamptz" in sql
        assert call_args[0][1] == "2025-01-15T00:00:00Z"


@pytest.mark.asyncio
async def test_unread_error_count_without_since():
    """Unread error count without since uses hardcoded 24-hour interval."""
    repo = AgentRepository()

    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"count": 2}))

        count = await repo.get_unread_error_count(since=None)

        assert count == 2
        sql = mock_db.execute_one.call_args[0][0]
        assert "interval '24 hours'" in sql
        # No parameters passed (interval is hardcoded)
        assert len(mock_db.execute_one.call_args[0]) == 1


@pytest.mark.asyncio
async def test_bell_notification_created_on_error_with_project():
    """Error with project_id creates pm_notification with correct title and type."""
    _rate_limit_cache.clear()

    mock_conn = AsyncMock()

    class MockAcquire:
        async def __aenter__(self):
            return mock_conn
        async def __aexit__(self, *args):
            pass

    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire()

    with patch("src.agent.core.error_notifier.agent_repo") as mock_repo, \
         patch("src.agent.core.error_notifier.get_db_pool", AsyncMock(return_value=mock_pool)):

        mock_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_repo.get_root_user_ids = AsyncMock(return_value=["root-1"])

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Stage not found",
            tool_name="update_stage",
            user_id="user-1",
            conversation_id="conv-1",
            project_id="proj-456",
            company_id="company-1",
        )

        # Verify PM notification INSERT
        assert mock_conn.execute.call_count == 1
        insert_args = mock_conn.execute.call_args[0]
        sql = insert_args[0]
        assert "INSERT INTO client_portal.pm_notifications" in sql
        assert "'agent_error'" in sql  # type
        assert "'agent_error'" in sql  # source_kind

        # Args: SQL, project_id, root_id, source_id, title, body
        title_arg = insert_args[4]  # title
        assert "update_stage" in title_arg

        body_arg = insert_args[5]  # body
        assert "Stage not found" in body_arg

    # Bell would now count this notification
    from src.services.notification_service import NotificationService

    bell_pool = MagicMock()
    bell_conn = AsyncMock()
    bell_conn.fetchrow = AsyncMock(return_value={"count": 1})
    bell_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=bell_conn)
    bell_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    service = NotificationService(bell_pool)
    bell_count = await service.unread_count("root-1")
    assert bell_count == 1


@pytest.mark.asyncio
async def test_notification_route_path_for_agent_error():
    """Bell notification for agent_error deep-links to /agent-troubleshooting."""
    from src.services.notification_service import NotificationService

    mock_pool = MagicMock()
    service = NotificationService(mock_pool)

    route = service.generate_route_path({
        "project_id": "proj-1",
        "source_kind": "agent_error",
        "source_id": "src-1",
    })

    assert route == "/agent-troubleshooting"


@pytest.mark.asyncio
async def test_full_workflow_error_to_cards():
    """Full workflow: error notifier fires → metric saved → summary reflects → badge shows."""
    _rate_limit_cache.clear()
    repo = AgentRepository()

    # Step 1: Error notifier fires and saves metric event
    with patch("src.agent.core.error_notifier.agent_repo") as mock_notifier_repo:
        mock_notifier_repo.save_metric_event = AsyncMock(return_value={"id": "evt-1"})
        mock_notifier_repo.get_root_user_ids = AsyncMock(return_value=[])

        await notify_root_admins_on_error(
            error_type="tool_execution_error",
            error_message="Task creation failed",
            tool_name="create_task",
            user_id="user-1",
        )

        # Verify metric saved with event_type="agent_error"
        mock_notifier_repo.save_metric_event.assert_called_once()
        saved_event_type = mock_notifier_repo.save_metric_event.call_args.kwargs["event_type"]
        assert saved_event_type == "agent_error"

    # Step 2: Summary endpoint returns updated counts (reflecting the error)
    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(side_effect=[
            _mock_row({"count": 1}),                                   # 1 failed tool
            _mock_row({"count": 0}),                                   # 0 error interactions
            _mock_row({"positive_count": 0, "negative_count": 0}),     # no feedback
            _mock_row({"tool_name": "create_task", "fail_count": 1}),  # top failing
        ])
        mock_db.execute_query = AsyncMock(return_value=[])

        summary = await repo.get_troubleshooting_summary("24h")

        assert summary["failedToolCalls"] == 1
        assert summary["topFailingTool"]["name"] == "create_task"

    # Step 3: Sidebar badge shows unread count
    with patch("src.agent.repositories.agent_repository.db_manager") as mock_db:
        mock_db.execute_one = AsyncMock(return_value=_mock_row({"count": 1}))

        badge_count = await repo.get_unread_error_count(since=None)
        assert badge_count == 1

    _rate_limit_cache.clear()
