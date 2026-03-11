"""
Step 8 — Trace-Based Regression Suite.

Codifies every known bug as a permanent test so it never recurs.
These are fast, unit-level tests using mocks.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestErrorDictDetectionInConfirm:
    """Regression: Error dict {"error": "..."} not detected as failure in /confirm endpoint.

    Fixed in: chat.py
    Root cause: The confirm endpoint checked for success by looking at truthiness
    of the result dict, but {"error": "..."} is truthy. Now explicitly checks
    for "error" key in the result dict.
    """

    @pytest.fixture
    def mock_confirmation(self):
        return {
            "id": "conf-123",
            "toolCallId": "tc-456",
            "conversationId": "conv-789",
            "userId": "user-001",
            "status": "pending",
        }

    @pytest.fixture
    def mock_tool_call(self):
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

    @pytest.mark.asyncio
    async def test_error_dict_returns_failure(self, mock_confirmation, mock_tool_call):
        """Tool returning {"error": "..."} must result in success=False."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = {
                "user_id": "user-001", "email": "a@test.com",
                "company_id": "c-123", "role": "admin",
            }
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute",
                       new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "a@test.com",
                             "companyId": "c-123", "role": "admin"}
                response = await process_confirmation(FakeRequest(), fake_user)

                assert response["result"]["success"] is False
                assert response["result"]["error"] == "Project not found or access denied"

    @pytest.mark.asyncio
    async def test_error_dict_saves_error_not_success_message(
        self, mock_confirmation, mock_tool_call
    ):
        """Error dict must NOT save 'Operation completed successfully.' to DB."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = {
                "user_id": "user-001", "email": "a@test.com",
                "company_id": "c-123", "role": "admin",
            }
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute",
                       new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "a@test.com",
                             "companyId": "c-123", "role": "admin"}
                await process_confirmation(FakeRequest(), fake_user)

                mock_repo.save_message.assert_called_once()
                saved_content = mock_repo.save_message.call_args[1].get("content") or \
                                (mock_repo.save_message.call_args[0][2]
                                 if len(mock_repo.save_message.call_args[0]) > 2 else None)
                assert saved_content != "Operation completed successfully."

    @pytest.mark.asyncio
    async def test_error_dict_marks_tool_call_as_failed(
        self, mock_confirmation, mock_tool_call
    ):
        """Error dict must update tool_call with execution_status='failed'."""
        exec_result = {"error": "Project not found or access denied"}

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = {
                "user_id": "user-001", "email": "a@test.com",
                "company_id": "c-123", "role": "admin",
            }
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute",
                       new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = exec_result

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "a@test.com",
                             "companyId": "c-123", "role": "admin"}
                await process_confirmation(FakeRequest(), fake_user)

                mock_repo.update_tool_call.assert_called_once()
                all_args = str(mock_repo.update_tool_call.call_args)
                assert "failed" in all_args


class TestExceptionHandlingInConfirm:
    """Regression: Tool raising exception must return success=False.

    Fixed in: chat.py
    Root cause: Unhandled exceptions in tool execution caused 500 errors
    instead of graceful failure responses.
    """

    @pytest.mark.asyncio
    async def test_exception_returns_failure(self):
        mock_confirmation = {
            "id": "conf-123", "toolCallId": "tc-456",
            "conversationId": "conv-789", "userId": "user-001", "status": "pending",
        }
        mock_tool_call = {
            "id": "tc-456", "toolName": "create_issue",
            "toolInput": json.dumps({"project_id": "p", "title": "t"}),
            "messageId": "msg-101", "conversationId": "conv-789",
        }

        with patch("src.agent.api.chat.agent_repo") as mock_repo, \
             patch("src.agent.api.chat.context_builder") as mock_ctx:
            mock_ctx.build_user_context.return_value = {
                "user_id": "user-001", "email": "a@test.com",
                "company_id": "c-123", "role": "admin",
            }
            mock_repo.get_pending_confirmation = AsyncMock(return_value=mock_confirmation)
            mock_repo.update_confirmation_status = AsyncMock(return_value=mock_confirmation)
            mock_repo.get_tool_call = AsyncMock(return_value=mock_tool_call)
            mock_repo.update_tool_call = AsyncMock()
            mock_repo.save_message = AsyncMock()

            with patch("src.agent.tools.executor.tool_executor.execute",
                       new_callable=AsyncMock) as mock_exec:
                mock_exec.side_effect = Exception("Database connection lost")

                from src.agent.api.chat import process_confirmation

                class FakeRequest:
                    confirmation_id = "conf-123"
                    action = "confirm"
                    modified_params = None

                fake_user = {"id": "user-001", "email": "a@test.com",
                             "companyId": "c-123", "role": "admin"}
                response = await process_confirmation(FakeRequest(), fake_user)

                assert response["result"]["success"] is False
                assert "Database connection lost" in response["result"]["error"]
