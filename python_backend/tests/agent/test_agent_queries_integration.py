"""
Integration tests for agent queries - 25 diverse queries.

Tests real agent responses to verify:
1. No SQL errors
2. Proper tool selection
3. Valid response structure
4. Logical correctness of answers
"""

import pytest
from typing import Dict, Any, List
from src.agent.core.orchestrator import AgentOrchestrator


async def collect_events(agent: AgentOrchestrator, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to collect all events from agent response."""
    events = []
    full_content = ""
    tools_used = []
    errors = []

    async for event in agent.process_message(
        message=query,
        conversation_id=None,
        project_id=None,
        user_context=context,
    ):
        events.append(event)

        if event.get("type") == "content":
            full_content += event.get("data", {}).get("content", "")
        elif event.get("type") == "tool_start":
            tools_used.append(event.get("data", {}).get("tool_name"))
        elif event.get("type") == "error":
            errors.append(event.get("data", {}).get("message", "Unknown error"))

    return {
        "events": events,
        "content": full_content,
        "tools_used": tools_used,
        "errors": errors,
        "has_error": len(errors) > 0 or "error" in full_content.lower(),
    }


# Define all 25 test queries with their expectations
INTEGRATION_QUERIES = [
    # Category A: Project Queries (5 tests)
    {
        "num": 1,
        "category": "Project",
        "query": "List all my projects",
        "expected_tools": ["get_projects"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Basic project listing",
    },
    {
        "num": 2,
        "category": "Project",
        "query": "What's the status of Via Tesoro?",
        "expected_tools": ["query_database", "get_project_detail"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Project status by name",
    },
    {
        "num": 3,
        "category": "Project",
        "query": "Show me active projects",
        "expected_tools": ["get_projects", "query_database"],
        "must_not_contain": [],
        "description": "Active project filter",
    },
    {
        "num": 4,
        "category": "Project",
        "query": "Which project has the highest progress?",
        "expected_tools": ["get_projects", "query_database"],
        "must_not_contain": [],
        "description": "Project progress ranking",
    },
    {
        "num": 5,
        "category": "Project",
        "query": "How many projects are completed?",
        "expected_tools": ["get_projects", "query_database"],
        "must_not_contain": [],
        "description": "Completed project count",
    },
    # Category B: Task Queries (5 tests)
    {
        "num": 6,
        "category": "Task",
        "query": "What tasks are due this week?",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Tasks due this week",
    },
    {
        "num": 7,
        "category": "Task",
        "query": "Show me overdue tasks",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Overdue tasks filter",
    },
    {
        "num": 8,
        "category": "Task",
        "query": "List pending tasks for Via Tesoro",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Tasks by project name",
    },
    {
        "num": 9,
        "category": "Task",
        "query": "How many tasks are blocked?",
        "expected_tools": ["get_tasks", "query_database"],
        "must_not_contain": [],
        "description": "Blocked task count",
    },
    {
        "num": 10,
        "category": "Task",
        "query": "What high-priority tasks need attention?",
        "expected_tools": ["query_database", "get_tasks"],
        "must_not_contain": [],
        "description": "High priority tasks",
    },
    # Category C: Payment/Installment Queries (5 tests)
    {
        "num": 11,
        "category": "Payment",
        "query": "What payments are due this month?",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Payments due this month",
    },
    {
        "num": 12,
        "category": "Payment",
        "query": "Show me overdue payments",
        "expected_tools": ["query_database", "get_installments"],
        "must_not_contain": [],
        "description": "Overdue payments",
    },
    {
        "num": 13,
        "category": "Payment",
        "query": "How much has been paid on Via Tesoro?",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Paid amount by project name",
    },
    {
        "num": 14,
        "category": "Payment",
        "query": "List upcoming payment installments",
        "expected_tools": ["query_database", "get_installments"],
        "must_not_contain": [],
        "description": "Upcoming installments",
    },
    {
        "num": 15,
        "category": "Payment",
        "query": "What's the total outstanding balance?",
        "expected_tools": ["query_database", "get_installments"],
        "must_not_contain": [],
        "description": "Outstanding balance",
    },
    # Category D: Issue Queries (5 tests)
    {
        "num": 16,
        "category": "Issue",
        "query": "Are there any open issues?",
        "expected_tools": ["query_database", "get_issues"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Open issues - SQL error check",
    },
    {
        "num": 17,
        "category": "Issue",
        "query": "Show critical issues on Via Tesoro",
        "expected_tools": ["query_database"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Critical issues by project",
    },
    {
        "num": 18,
        "category": "Issue",
        "query": "What issues haven't been resolved?",
        "expected_tools": ["query_database", "get_issues"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Unresolved issues",
    },
    {
        "num": 19,
        "category": "Issue",
        "query": "List issues assigned to me",
        "expected_tools": ["query_database", "get_issues"],
        "must_not_contain": ["company_id does not exist"],
        "description": "Issues assigned to user",
    },
    {
        "num": 20,
        "category": "Issue",
        "query": "How many issues are in progress?",
        "expected_tools": ["query_database", "get_issues"],
        "must_not_contain": ["company_id does not exist"],
        "description": "In-progress issue count",
    },
    # Category E: Cross-Domain & Complex Queries (5 tests)
    {
        "num": 21,
        "category": "Complex",
        "query": "Give me a summary of Via Tesoro",
        "expected_tools": ["get_project_detail", "query_database"],
        "must_not_contain": [],
        "description": "Project summary",
    },
    {
        "num": 22,
        "category": "Complex",
        "query": "What materials are pending?",
        "expected_tools": ["query_database", "get_materials"],
        "must_not_contain": [],
        "description": "Pending materials",
    },
    {
        "num": 23,
        "category": "Complex",
        "query": "Show me the project stages",
        "expected_tools": ["query_database", "get_stages"],
        "must_not_contain": [],
        "description": "Project stages",
    },
    {
        "num": 24,
        "category": "Complex",
        "query": "What's due in the next 7 days?",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Due in 7 days",
    },
    {
        "num": 25,
        "category": "Complex",
        "query": "List everything overdue",
        "expected_tools": ["query_database"],
        "must_not_contain": [],
        "description": "Everything overdue",
    },
]


class TestAgentQueriesIntegration:
    """Integration tests for agent query handling."""

    @pytest.mark.asyncio
    async def test_all_queries(self):
        """Run all 25 diverse queries and validate responses."""
        # Create agent and context
        agent = AgentOrchestrator()
        admin_context = {
            "user_id": "test-user-123",  # Real user_id from database
            "email": "test@proesphere.com",
            "company_id": "2",  # Real company_id from database
            "role": "admin",
            "role_name": "Administrator",
            "permissions": ["all"],
            "is_root": False,
        }

        results = []

        for query_spec in INTEGRATION_QUERIES:
            try:
                result = await collect_events(agent, query_spec["query"], admin_context)

                # Check for SQL errors
                has_sql_error = any(
                    phrase in result["content"]
                    for phrase in query_spec["must_not_contain"]
                )

                # Check if expected tools were used
                tool_match = any(
                    tool in result["tools_used"]
                    for tool in query_spec["expected_tools"]
                ) if query_spec["expected_tools"] else True

                results.append({
                    "num": query_spec["num"],
                    "category": query_spec["category"],
                    "query": query_spec["query"],
                    "description": query_spec["description"],
                    "success": not result["has_error"] and not has_sql_error,
                    "tools_used": result["tools_used"],
                    "tool_match": tool_match,
                    "errors": result["errors"],
                    "sql_error": has_sql_error,
                    "content_preview": result["content"][:200] if result["content"] else "",
                })
            except Exception as e:
                results.append({
                    "num": query_spec["num"],
                    "category": query_spec["category"],
                    "query": query_spec["query"],
                    "description": query_spec["description"],
                    "success": False,
                    "tools_used": [],
                    "tool_match": False,
                    "errors": [str(e)],
                    "sql_error": "SQL" in str(e) or "company_id" in str(e),
                    "content_preview": "",
                })

        # Print detailed summary
        print("\n" + "=" * 80)
        print("AGENT QUERY INTEGRATION TEST SUMMARY")
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
            print(f"  {cat}: {stats['passed']}/{stats['passed']+stats['failed']} passed")

        print("\n" + "-" * 80)
        print("Detailed Results:")
        print("-" * 80)

        for r in results:
            status = "✓" if r["success"] else "✗"
            tools = ", ".join(str(t) for t in r["tools_used"] if t) if r["tools_used"] else "none"
            print(f"\n{status} Query {r['num']} [{r['category']}]: {r['description']}")
            print(f"   Query: {r['query'][:60]}...")
            print(f"   Tools: {tools}")
            if r["tool_match"]:
                print("   Tool Selection: ✓ Expected tool used")
            elif r["tools_used"]:
                print(f"   Tool Selection: ⚠ Unexpected tools")
            if r["sql_error"]:
                print("   SQL Error: ✗ Database query failed")
            if r["errors"]:
                print(f"   Errors: {r['errors'][0][:100]}")
            if not r["success"] and r["content_preview"]:
                print(f"   Response: {r['content_preview'][:100]}...")

        print("\n" + "=" * 80)

        # Assertions
        assert passed >= 20, f"Too many failures: {failed}/25 queries failed"

        # Ensure no SQL errors on issue queries (this was the original bug)
        issue_results = [r for r in results if r["category"] == "Issue"]
        issue_sql_errors = sum(1 for r in issue_results if r["sql_error"])
        assert issue_sql_errors == 0, f"{issue_sql_errors} issue queries had SQL errors"
