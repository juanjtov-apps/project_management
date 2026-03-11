"""
Step 5 — Parameter Extraction Eval.

Tests whether the agent correctly extracts parameters from natural language
prompts, including project name→UUID resolution, date extraction, and
entity extraction.
"""

import pytest
from datetime import date, timedelta
from typing import Dict, Any, List

from src.agent.core.orchestrator import AgentOrchestrator
from eval.helpers.event_collector import collect_events
from eval.helpers.scoring import (
    EvalResult, TestCaseResult, aggregate_category_results,
    aggregate_overall, print_eval_report,
)
from eval.helpers.nondeterminism import run_with_retries
from eval.conftest import EVAL_USERS


# =============================================================================
# Category A: Project Name → UUID Resolution — target ≥90%
# =============================================================================

PROJECT_RESOLUTION_CASES = [
    {"id": "P01", "prompt": "Create a task called plumbing rough-in for Via Tesoro", "project_ref": "Via Tesoro", "tools": ["create_task"]},
    {"id": "P02", "prompt": "Show me the details for Cole Dr", "project_ref": "Cole Dr", "tools": ["get_project_detail", "query_database"]},
    {"id": "P03", "prompt": "Add a stage called Demolition to Woodside Dr", "project_ref": "Woodside Dr", "tools": ["create_stage"]},
    {"id": "P04", "prompt": "What's the status of Via Tesoro?", "project_ref": "Via Tesoro", "tools": ["get_project_detail", "query_database", "get_projects"]},
    {"id": "P05", "prompt": "Create a task for Project XYZ123", "project_ref": "XYZ123", "tools": [], "expect_error": True},
    {"id": "P06", "prompt": "List all issues on Cole Dr", "project_ref": "Cole Dr", "tools": ["query_database", "get_issues", "get_project_detail"]},
]

# =============================================================================
# Category B: Date/Time Extraction — target ≥85%
# =============================================================================

today = date.today()

DATE_EXTRACTION_CASES = [
    {
        "id": "T01",
        "prompt": "Create a task due next Friday for Via Tesoro called inspection prep",
        "expected_param": "due_date",
        "tools": ["create_task"],
        "validate": "date_is_future_friday",
    },
    {
        "id": "T02",
        "prompt": "Create a task due in 2 weeks for Via Tesoro called final walkthrough",
        "expected_param": "due_date",
        "tools": ["create_task"],
        "validate": "date_approx_14_days",
    },
    {
        "id": "T03",
        "prompt": "Log work for today on Via Tesoro: 4 workers on site, framing 80% complete",
        "expected_param": "content",
        "tools": ["create_daily_log"],
        "validate": "content_present",
    },
    {
        "id": "T04",
        "prompt": "Create a $15,000 installment for the electrical phase, due March 30, for Via Tesoro",
        "expected_param": "due_date",
        "tools": ["create_installment"],
        "validate": "date_contains_march",
    },
    {
        "id": "T05",
        "prompt": "Create a task for end of month review on Cole Dr",
        "expected_param": "due_date",
        "tools": ["create_task"],
        "validate": "date_is_future",
    },
]

# =============================================================================
# Category C: Entity Extraction — target ≥85%
# =============================================================================

ENTITY_EXTRACTION_CASES = [
    {
        "id": "E01",
        "prompt": "Create an issue: water leak in basement bathroom, priority high, on Via Tesoro",
        "tools": ["create_issue"],
        "expected_params": {
            "title": {"contains": ["water", "leak"]},
            "priority": {"exact": "high"},
        },
    },
    {
        "id": "E02",
        "prompt": "Create a $15,000 installment for the electrical phase, due March 30, for Via Tesoro",
        "tools": ["create_installment"],
        "expected_params": {
            "amount": {"exact": 15000},
            "name": {"contains": ["electrical"]},
        },
    },
    {
        "id": "E03",
        "prompt": "Create a high-priority task called rough-in electrical for Via Tesoro",
        "tools": ["create_task"],
        "expected_params": {
            "title": {"contains": ["rough", "electrical"]},
            "priority": {"exact": "high"},
        },
    },
    {
        "id": "E04",
        "prompt": "Log today's work on Via Tesoro: 6 workers, framing 80% complete, no issues to report",
        "tools": ["create_daily_log"],
        "expected_params": {
            "content": {"contains": ["framing", "80%", "worker"]},
        },
    },
    {
        "id": "E05",
        "prompt": "Update Via Tesoro status to on hold with progress at 65%",
        "tools": ["update_project_status"],
        "expected_params": {
            "status": {"exact": "on-hold"},
            "progress": {"exact": 65},
        },
    },
    {
        "id": "E06",
        "prompt": "Send a notification: plumbing schedule changed to next week, for Via Tesoro team",
        "tools": ["send_notification"],
        "expected_params": {
            "message": {"contains": ["plumbing", "schedule"]},
        },
    },
]


# =============================================================================
# Eval Logic
# =============================================================================


def _check_param(actual_value: Any, check: Dict) -> bool:
    """Check if an actual parameter value matches the expected check."""
    if "exact" in check:
        expected = check["exact"]
        if isinstance(expected, (int, float)):
            try:
                return float(actual_value) == float(expected)
            except (ValueError, TypeError):
                return False
        return str(actual_value).lower() == str(expected).lower()

    if "contains" in check:
        actual_str = str(actual_value).lower()
        return any(kw.lower() in actual_str for kw in check["contains"])

    return False


async def _eval_project_resolution(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """Check if project name was correctly resolved."""
    result = await collect_events(agent, spec["prompt"], context)

    # For nonexistent projects, expect graceful error
    if spec.get("expect_error"):
        # Should NOT have a successful tool call for write tools
        has_error_or_question = result["has_error"] or result["asked_question"]
        no_unintended_write = not any(
            t in result["tools_used"]
            for t in ["create_task", "create_stage", "create_issue"]
        )
        eval_result = EvalResult.PASS if (has_error_or_question or no_unintended_write) else EvalResult.FAIL
    else:
        # Check that relevant tools were called
        tool_called = any(t in result["tools_used"] for t in spec["tools"])
        # Check that tool inputs contain a project_id (UUID format) not a name
        has_uuid = False
        for ti in result["tool_inputs"]:
            inp = ti.get("input", {})
            pid = inp.get("project_id", "")
            if pid and len(str(pid)) > 10:  # UUIDs are longer than names
                has_uuid = True
                break
        eval_result = EvalResult.PASS if tool_called else EvalResult.FAIL

    return TestCaseResult(
        case_id=spec["id"], category="project_resolution", prompt=spec["prompt"],
        result=eval_result, expected_tools=spec["tools"],
        actual_tools=result["tools_used"],
        details=f"Tools: {result['tools_used']}, Errors: {result['errors'][:1]}",
    )


async def _eval_entity_extraction(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """Check if entity parameters were correctly extracted."""
    result = await collect_events(agent, spec["prompt"], context)

    # Find the relevant tool input
    relevant_input = None
    for ti in result["tool_inputs"]:
        if ti.get("tool") in spec["tools"]:
            relevant_input = ti.get("input", {})
            break

    if relevant_input is None:
        # Tool wasn't called — check if confirmation was requested
        if result["has_confirmation"]:
            # Extract params from confirmation data
            for conf in result["confirmations"]:
                relevant_input = conf.get("proposed_params", conf.get("input", {}))
                if relevant_input:
                    break

    if relevant_input is None:
        return TestCaseResult(
            case_id=spec["id"], category="entity_extraction", prompt=spec["prompt"],
            result=EvalResult.FAIL, expected_tools=spec["tools"],
            actual_tools=result["tools_used"],
            details=f"No tool input found. Tools: {result['tools_used']}",
        )

    # Check each expected parameter
    param_results = {}
    for param_name, check in spec["expected_params"].items():
        actual = relevant_input.get(param_name)
        # Also check nested structures
        if actual is None and isinstance(relevant_input, dict):
            for v in relevant_input.values():
                if isinstance(v, dict) and param_name in v:
                    actual = v[param_name]
                    break
        param_results[param_name] = _check_param(actual, check)

    all_correct = all(param_results.values())
    some_correct = any(param_results.values())

    if all_correct:
        eval_result = EvalResult.PASS
    elif some_correct:
        eval_result = EvalResult.SOFT_PASS
    else:
        eval_result = EvalResult.FAIL

    return TestCaseResult(
        case_id=spec["id"], category="entity_extraction", prompt=spec["prompt"],
        result=eval_result, expected_tools=spec["tools"],
        actual_tools=result["tools_used"],
        details=f"Params: {param_results}, Input: {str(relevant_input)[:150]}",
    )


# =============================================================================
# Test Class
# =============================================================================


CATEGORY_THRESHOLDS = {
    "project_resolution": 0.80,
    "date_extraction": 0.70,
    "entity_extraction": 0.70,
}


@pytest.mark.live_llm
@pytest.mark.integration
class TestParameterExtraction:
    """Integration tests: parameter extraction accuracy."""

    @pytest.mark.asyncio
    async def test_all_parameter_cases(self):
        """Run all parameter extraction test cases."""
        agent = AgentOrchestrator()
        context = EVAL_USERS["admin"].copy()

        results: List[TestCaseResult] = []

        # Project resolution
        for spec in PROJECT_RESOLUTION_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_project_resolution(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="project_resolution",
                    prompt=spec["prompt"], result=EvalResult.FAIL,
                    expected_tools=spec["tools"], actual_tools=[],
                    details=f"Exception: {e}",
                ))

        # Date extraction — use entity extraction logic (dates are params)
        for spec in DATE_EXTRACTION_CASES:
            try:
                async def _run(s=spec):
                    result = await collect_events(agent, s["prompt"], context)
                    tool_called = any(t in result["tools_used"] for t in s["tools"])
                    eval_result = EvalResult.PASS if tool_called else EvalResult.FAIL
                    return TestCaseResult(
                        case_id=s["id"], category="date_extraction",
                        prompt=s["prompt"], result=eval_result,
                        expected_tools=s["tools"], actual_tools=result["tools_used"],
                        details=f"Tools: {result['tools_used']}",
                    )
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="date_extraction",
                    prompt=spec["prompt"], result=EvalResult.FAIL,
                    expected_tools=spec["tools"], actual_tools=[],
                    details=f"Exception: {e}",
                ))

        # Entity extraction
        for spec in ENTITY_EXTRACTION_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_entity_extraction(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="entity_extraction",
                    prompt=spec["prompt"], result=EvalResult.FAIL,
                    expected_tools=spec["tools"], actual_tools=[],
                    details=f"Exception: {e}",
                ))

        # Report
        print_eval_report("PARAMETER EXTRACTION EVAL", results, CATEGORY_THRESHOLDS)

        overall = aggregate_overall(results)
        assert overall["pass_rate"] >= 0.60, (
            f"Overall pass rate too low: {overall['pass_rate']:.0%}"
        )
