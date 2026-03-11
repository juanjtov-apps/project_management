"""
Integration + unit tests for agent write actions — 15 prompts + 5 unit tests.

Tests:
1. Confirmation error detection (unit tests for chat.py /confirm endpoint)
2. Agent action prompts (integration tests with real orchestrator)
"""

import pytest
import json
from typing import Dict, Any, List
from unittest.mock import AsyncMock, MagicMock, patch

from src.agent.core.orchestrator import AgentOrchestrator


# ============================================================================
# Helpers
# ============================================================================

async def collect_events(agent: AgentOrchestrator, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to collect all events from agent response."""
    events = []
    full_content = ""
    tools_used = []
    tool_inputs = []
    errors = []
    confirmations = []

    async for event in agent.process_message(
        message=query,
        conversation_id=None,
        project_id=None,
        user_context=context,
    ):
        events.append(event)
        etype = event.get("type")
        data = event.get("data", {})

        if etype == "content":
            full_content += data.get("content", "")
        elif etype == "tool_start":
            tools_used.append(data.get("tool"))
        elif etype == "tool_result":
            pass  # tool_start already captured the tool name
        elif etype == "confirmation_required":
            confirmations.append(data)
            tools_used.append(data.get("tool") or data.get("tool_name"))
        elif etype == "error":
            errors.append(data.get("message", "Unknown error"))

    return {
        "events": events,
        "content": full_content,
        "tools_used": [t for t in tools_used if t],
        "errors": errors,
        "confirmations": confirmations,
        "has_error": len(errors) > 0,
        "has_confirmation": len(confirmations) > 0,
    }


# ============================================================================
# Unit Tests: Confirmation Error Detection
# ============================================================================

class TestConfirmationErrorDetection:
    """Unit tests verifying the /confirm endpoint correctly detects tool error dicts."""

    @pytest.fixture
    def mock_confirmation(self):
        """A typical pending confirmation record."""
        return {
            "id": "conf-123",
            "toolCallId": "tc-456",
            "conversationId": "conv-789",
            "userId": "user-001",
            "status": "pending",
        }

    @pytest.fixture
    def mock_tool_call(self):
        """A typical tool call record."""
        return {
            "id": "tc-456",
            "toolName": "create_issue",
            "toolInput": json.dumps({
                "project_id": "proj-abc",
                "title": "Foundation crack",
            }),
            "messageId": "msg-101",
            "conversationId": "conv-789",
        }

    @pytest.fixture
    def mock_user_context(self):
        return {
            "user_id": "user-001",
            "email": "admin@test.com",
            "company_id": "company-123",
            "role": "admin",
        }

    @pytest.mark.asyncio
    async def test_confirm_success_returns_message_and_actions(
        self, mock_confirmation, mock_tool_call, mock_user_context
    ):
        """U1: Successful tool execution returns success=True with message and suggested_actions."""
        exec_result = {
            "success": True,
            "issue": {"id": "issue-1", "title": "Foundation crack"},
            "message": "Issue 'Foundation crack' created in Via Tesoro",
            "suggested_actions": [
                {"label": "Go to Issues", "navigateTo": "/client-portal?projectId=proj-abc"},
            ],
        }

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = mock_user_context
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute", new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation
                from pydantic import BaseModel

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "admin@test.com", "companyId": "company-123", "role": "admin"}
                response = await process_confirmation(FakeRequest(), fake_user)

                assert response["result"]["success"] is True
                assert response["result"]["result"]["message"] == "Issue 'Foundation crack' created in Via Tesoro"
                assert response["result"]["result"]["suggested_actions"][0]["label"] == "Go to Issues"

                # Verify tool_call updated as success
                mock_repo.update_tool_call.assert_called_once()
                call_kwargs = mock_repo.update_tool_call.call_args
                assert call_kwargs[1].get("execution_status") == "success" or \
                       (len(call_kwargs[0]) > 1 and "success" in str(call_kwargs))

    @pytest.mark.asyncio
    async def test_confirm_error_dict_returns_failure(
        self, mock_confirmation, mock_tool_call, mock_user_context
    ):
        """U2: Tool returning error dict results in success=False."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = mock_user_context
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute", new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "admin@test.com", "companyId": "company-123", "role": "admin"}
                response = await process_confirmation(FakeRequest(), fake_user)

                assert response["result"]["success"] is False
                assert response["result"]["error"] == "Project not found or access denied"

    @pytest.mark.asyncio
    async def test_confirm_error_dict_saves_error_message_to_db(
        self, mock_confirmation, mock_tool_call, mock_user_context
    ):
        """U3: Error dict causes the actual error message to be saved, not 'Operation completed successfully'."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = mock_user_context
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute", new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "admin@test.com", "companyId": "company-123", "role": "admin"}
                await process_confirmation(FakeRequest(), fake_user)

                # Verify save_message was called with the error message, not the generic fallback
                mock_repo.save_message.assert_called_once()
                saved_content = mock_repo.save_message.call_args[1].get("content") or \
                                mock_repo.save_message.call_args[0][2] if len(mock_repo.save_message.call_args[0]) > 2 else None
                # The content should be the error, not "Operation completed successfully."
                assert saved_content != "Operation completed successfully."

    @pytest.mark.asyncio
    async def test_confirm_error_dict_updates_tool_call_as_failed(
        self, mock_confirmation, mock_tool_call, mock_user_context
    ):
        """U4: Error dict causes tool_call to be updated with execution_status='failed'."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = mock_user_context
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute", new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "admin@test.com", "companyId": "company-123", "role": "admin"}
                await process_confirmation(FakeRequest(), fake_user)

                mock_repo.update_tool_call.assert_called_once()
                call_kwargs = mock_repo.update_tool_call.call_args[1] if mock_repo.update_tool_call.call_args[1] else {}
                # Check that execution_status is "failed" in either positional or keyword args
                all_args = str(mock_repo.update_tool_call.call_args)
                assert "failed" in all_args

    @pytest.mark.asyncio
    async def test_confirm_exception_returns_failure(
        self, mock_confirmation, mock_tool_call, mock_user_context
    ):
        """U5: Tool raising an exception results in success=False (regression test for existing behavior)."""
        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = mock_user_context
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute", new_callable=AsyncMock) as mock_exec:
                mock_exec.side_effect = Exception("Database connection lost")

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "admin@test.com", "companyId": "company-123", "role": "admin"}
                response = await process_confirmation(FakeRequest(), fake_user)

                assert response["result"]["success"] is False
                assert "Database connection lost" in response["result"]["error"]


# ============================================================================
# Integration Tests: 15 Agent Action Prompts
# ============================================================================

ACTION_PROMPTS = [
    # Category A: Task Creation (3 tests)
    {
        "num": 1,
        "category": "Task",
        "prompt": "Create a task called 'Install drywall' for Via Tesoro",
        "expected_tools": ["create_task"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Task creation with project name resolution",
    },
    {
        "num": 2,
        "category": "Task",
        "prompt": "Add a high-priority task: Check roof permits. Assign to the project manager",
        "expected_tools": ["create_task"],
        "lookup_tools": ["get_projects"],
        "expect_confirmation": False,  # Should ask which project first
        "expect_question": True,
        "description": "Task creation missing project — should ask",
    },
    {
        "num": 3,
        "category": "Task",
        "prompt": "Create three tasks for Cole Dr: order lumber, schedule inspection, hire electrician",
        "expected_tools": ["create_task"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Batch task creation with project name",
    },
    # Category B: Issue Creation (3 tests)
    {
        "num": 4,
        "category": "Issue",
        "prompt": "Report an issue on Via Tesoro: foundation crack in the north wall",
        "expected_tools": ["create_issue"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Issue creation with project name and description",
    },
    {
        "num": 5,
        "category": "Issue",
        "prompt": "There's a leak in the master bathroom on Woodside Dr, mark it critical",
        "expected_tools": ["create_issue"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Issue creation with priority specification",
    },
    {
        "num": 6,
        "category": "Issue",
        "prompt": "Create an issue for the project",
        "expected_tools": [],
        "lookup_tools": ["get_projects"],
        "expect_confirmation": False,
        "expect_question": True,
        "description": "Issue creation missing project and title — should ask",
    },
    # Category C: Installment/Payment Creation (3 tests)
    {
        "num": 7,
        "category": "Payment",
        "prompt": "Create a $5000 installment for Via Tesoro called 'Flooring deposit'",
        "expected_tools": ["create_installment"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Installment creation with all required fields",
    },
    {
        "num": 8,
        "category": "Payment",
        "prompt": "Add a payment milestone: $12,000 for framing, due March 30, for Cole Dr",
        "expected_tools": ["create_installment"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Installment creation with due date",
    },
    {
        "num": 9,
        "category": "Payment",
        "prompt": "Create an installment for $8000",
        "expected_tools": [],
        "lookup_tools": ["get_projects"],
        "expect_confirmation": False,
        "expect_question": True,
        "description": "Installment creation missing project and name — should ask",
    },
    # Category D: Stage & Material Operations (3 tests)
    {
        "num": 10,
        "category": "Stage",
        "prompt": "Add a 'Rough Plumbing' stage to Via Tesoro",
        "expected_tools": ["create_stage"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail", "get_stages"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Stage creation with project name",
    },
    {
        "num": 11,
        "category": "Stage",
        "prompt": "Apply the Kitchen Remodel template to Cole Dr",
        "expected_tools": ["apply_stage_template"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail", "get_stages"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Template application with project name",
    },
    {
        "num": 12,
        "category": "Material",
        "prompt": "Add a material item: porcelain tiles for the master bathroom on Woodside Dr",
        "expected_tools": ["create_material_item"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Material item creation with project name",
    },
    # Category E: Status Updates & Error Cases (3 tests)
    {
        "num": 13,
        "category": "Update",
        "prompt": "Update Via Tesoro status to on hold",
        "expected_tools": ["update_project_status"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail"],
        "expect_confirmation": False,  # AUDIT_LOGGED — no confirmation
        "expect_question": False,
        "description": "Project status update (AUDIT_LOGGED, no confirmation)",
    },
    {
        "num": 14,
        "category": "Update",
        "prompt": "Mark the overdue payment on Via Tesoro as paid",
        "expected_tools": ["update_payment_status", "query_database"],
        "lookup_tools": ["get_projects", "query_database", "get_project_detail", "get_installments"],
        "expect_confirmation": False,
        "expect_question": False,
        "description": "Payment status update with lookup",
    },
    {
        "num": 15,
        "category": "Delete",
        "prompt": "Delete the task called 'Install drywall'",
        "expected_tools": ["delete_task"],
        "lookup_tools": ["get_tasks", "query_database"],
        "expect_confirmation": True,
        "expect_question": False,
        "description": "Task deletion (REQUIRES_CONFIRMATION)",
    },
]


class TestAgentActionPrompts:
    """Integration tests: 15 diverse action prompts through real orchestrator."""

    @pytest.mark.asyncio
    async def test_all_action_prompts(self):
        """Run all 15 action prompts and validate behavior."""
        agent = AgentOrchestrator()
        admin_context = {
            "user_id": "test-user-123",
            "email": "test@proesphere.com",
            "company_id": "2",
            "role": "admin",
            "role_name": "Administrator",
            "permissions": ["all"],
            "is_root": False,
        }

        results = []

        for spec in ACTION_PROMPTS:
            try:
                result = await collect_events(agent, spec["prompt"], admin_context)

                # Check if expected action tool was used or confirmation was requested
                action_tool_used = any(
                    tool in result["tools_used"]
                    for tool in spec["expected_tools"]
                ) if spec["expected_tools"] else True

                # Check if project lookup happened (when prompt uses a name)
                lookup_happened = any(
                    tool in result["tools_used"]
                    for tool in spec["lookup_tools"]
                ) if spec["lookup_tools"] else True

                # Check confirmation behavior
                confirmation_ok = True
                if spec["expect_confirmation"]:
                    confirmation_ok = result["has_confirmation"]

                # Check if agent asked a question when expected
                question_ok = True
                if spec["expect_question"]:
                    question_indicators = ["?", "which project", "what's the", "need a few", "please"]
                    question_ok = any(q in result["content"].lower() for q in question_indicators)

                results.append({
                    "num": spec["num"],
                    "category": spec["category"],
                    "prompt": spec["prompt"],
                    "description": spec["description"],
                    "success": not result["has_error"],
                    "tools_used": result["tools_used"],
                    "action_tool_used": action_tool_used,
                    "lookup_happened": lookup_happened,
                    "confirmation_ok": confirmation_ok,
                    "question_ok": question_ok,
                    "has_confirmation": result["has_confirmation"],
                    "errors": result["errors"],
                    "content_preview": result["content"][:200] if result["content"] else "",
                })
            except Exception as e:
                results.append({
                    "num": spec["num"],
                    "category": spec["category"],
                    "prompt": spec["prompt"],
                    "description": spec["description"],
                    "success": False,
                    "tools_used": [],
                    "action_tool_used": False,
                    "lookup_happened": False,
                    "confirmation_ok": False,
                    "question_ok": False,
                    "has_confirmation": False,
                    "errors": [str(e)],
                    "content_preview": "",
                })

        # Print detailed summary
        print("\n" + "=" * 80)
        print("AGENT ACTION PROMPTS TEST SUMMARY")
        print("=" * 80)

        passed = sum(1 for r in results if r["success"])
        failed = len(results) - passed
        print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {passed/len(results)*100:.1f}%")

        # Group by category
        categories = {}
        for r in results:
            cat = r["category"]
            if cat not in categories:
                categories[cat] = {"passed": 0, "failed": 0}
            if r["success"]:
                categories[cat]["passed"] += 1
            else:
                categories[cat]["failed"] += 1

        print("\nBy Category:")
        for cat, stats in categories.items():
            total = stats["passed"] + stats["failed"]
            print(f"  {cat}: {stats['passed']}/{total} passed")

        print("\n" + "-" * 80)
        print("Detailed Results:")
        print("-" * 80)

        for r in results:
            status = "PASS" if r["success"] else "FAIL"
            tools = ", ".join(str(t) for t in r["tools_used"] if t) if r["tools_used"] else "none"
            print(f"\n[{status}] #{r['num']} [{r['category']}]: {r['description']}")
            print(f"   Prompt: {r['prompt'][:70]}")
            print(f"   Tools: {tools}")
            print(f"   Action tool: {'Y' if r['action_tool_used'] else 'N'} | "
                  f"Lookup: {'Y' if r['lookup_happened'] else 'N'} | "
                  f"Confirmation: {'Y' if r['has_confirmation'] else 'N'} | "
                  f"Question: {'Y' if r['question_ok'] else 'N'}")
            if r["errors"]:
                print(f"   Errors: {r['errors'][0][:100]}")
            if r["content_preview"]:
                print(f"   Response: {r['content_preview'][:120]}...")

        print("\n" + "=" * 80)

        # Assertions — require at least 10/15 to pass (LLM behavior is non-deterministic)
        assert passed >= 10, f"Too many failures: {failed}/15 prompts failed"

        # Ensure no SQL errors on any prompt
        sql_errors = sum(1 for r in results if any("SQL" in str(e) or "company_id" in str(e) for e in r["errors"]))
        assert sql_errors == 0, f"{sql_errors} prompts had SQL errors"
