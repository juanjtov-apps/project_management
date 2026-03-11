"""
Step 3 — Follow-Up Question Quality Eval.

Tests whether Proe asks follow-up questions when it should, whether those
questions are the right questions, and whether it avoids unnecessary follow-ups.
"""

import pytest
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
# Category A: Should Ask But Doesn't (Missing Follow-Up) — target ≥90%
# =============================================================================

SHOULD_ASK_CASES = [
    {"id": "FA01", "prompt": "Update the project", "keywords": ["which project", "what would you like"]},
    {"id": "FA02", "prompt": "Mark it as done", "keywords": ["which", "what", "referring"]},
    {"id": "FA03", "prompt": "Add drywall", "keywords": ["material", "task", "stage", "which"]},
    {"id": "FA04", "prompt": "Send a message to the team", "keywords": ["what", "message", "say"]},
    {"id": "FA05", "prompt": "How much is left?", "keywords": ["budget", "timeline", "tasks", "which"]},
    {"id": "FA06", "prompt": "Fix the issue", "keywords": ["which issue", "which project"]},
    {"id": "FA07", "prompt": "Create a payment", "keywords": ["which project", "how much", "amount"]},
]

# =============================================================================
# Category B: Asks But Shouldn't (Unnecessary Follow-Up) — target ≥95%
# =============================================================================

SHOULD_NOT_ASK_CASES = [
    {"id": "FB01", "prompt": "Create a task called install kitchen cabinets for Via Tesoro, due next Friday, assign to Marco", "expected_tools": ["create_task"]},
    {"id": "FB02", "prompt": "Log today's daily report: 6 workers on site, framing 80% complete, no issues", "expected_tools": ["create_daily_log"]},
    {"id": "FB03", "prompt": "Delete the drywall patching task from Cole Dr", "expected_tools": ["delete_task"]},
    {"id": "FB04", "prompt": "What's the status of Via Tesoro?", "expected_tools": ["get_project_detail", "query_database", "get_projects"]},
    {"id": "FB05", "prompt": "Mark the Framing stage as complete on Cole Dr", "expected_tools": ["update_stage"]},
    {"id": "FB06", "prompt": "Mark the foundation crack issue as resolved on Via Tesoro", "expected_tools": ["update_issue_status"]},
    {"id": "FB07", "prompt": "Change the foundation installment amount to $8000 for Via Tesoro", "expected_tools": ["update_installment"]},
    {"id": "FB08", "prompt": "Put Via Tesoro on hold immediately", "expected_tools": ["update_project_status"]},
    {"id": "FB09", "prompt": "Mark the foundation payment as received for Via Tesoro", "expected_tools": ["update_payment_status"]},
    {"id": "FB10", "prompt": "Create an issue for water damage in the basement at Cole Dr, priority high", "expected_tools": ["create_issue"]},
    {"id": "FB11", "prompt": "Add a new stage called Finishing to Cole Dr", "expected_tools": ["create_stage"]},
    {"id": "FB12", "prompt": "Assign the flooring task to Marco on Via Tesoro", "expected_tools": ["assign_task"]},
    {"id": "FB13", "prompt": "Add 50 bags of cement as materials for Via Tesoro", "expected_tools": ["create_material_item"]},
    {"id": "FB14", "prompt": "Send a notification to the plumbing team about the delay on Cole Dr", "expected_tools": ["send_notification"]},
    {"id": "FB15", "prompt": "Apply the Kitchen Remodel template to Cole Dr project", "expected_tools": ["apply_stage_template"]},
    {"id": "FB16", "prompt": "What stage templates are available for new projects?", "expected_tools": ["get_stage_templates"]},
    {"id": "FB17", "prompt": "Show me all tasks for Cole Dr", "expected_tools": ["get_tasks", "query_database"]},
    {"id": "FB18", "prompt": "What issues are still open on Via Tesoro?", "expected_tools": ["get_issues", "query_database"]},
    {"id": "FB19", "prompt": "Show me all installments for Cole Dr", "expected_tools": ["get_installments", "query_database"]},
    {"id": "FB20", "prompt": "What stages does Via Tesoro have?", "expected_tools": ["get_stages", "query_database"]},
    {"id": "FB21", "prompt": "Show me the materials list for Cole Dr", "expected_tools": ["get_materials", "query_database"]},
    {"id": "FB22", "prompt": "Update the project details with the new address 123 Oak St for Cole Dr", "expected_tools": ["update_project_details"]},
    {"id": "FB23", "prompt": "Mark the electrical rough-in task as complete on Via Tesoro", "expected_tools": ["update_task_status"]},
    {"id": "FB24", "prompt": "Create a $5000 installment for Via Tesoro called flooring deposit, due April 1", "expected_tools": ["create_installment"]},
]

# =============================================================================
# Category C: Asks the Wrong Question — target ≥85%
# =============================================================================

WRONG_QUESTION_CASES = [
    {
        "id": "FC01",
        "prompt": "Add an installment for the sub",
        "right_keywords": ["which sub", "which project", "subcontractor"],
        "wrong_keywords": ["what amount"],  # Missing which sub is more critical
    },
    {
        "id": "FC02",
        "prompt": "Update the stage",
        "right_keywords": ["which project", "which stage"],
        "wrong_keywords": [],
    },
    {
        "id": "FC03",
        "prompt": "There's a problem with the electrical",
        "right_keywords": ["which project", "issue", "track"],
        "wrong_keywords": [],
    },
    {
        "id": "FC04",
        "prompt": "Schedule the inspection",
        "right_keywords": ["which project", "task", "can't schedule"],
        "wrong_keywords": ["when should I schedule"],  # Implies capability that doesn't exist
    },
]

# =============================================================================
# Category E: Multi-Turn Follow-Up Resolution — target ≥90%
# =============================================================================

MULTI_TURN_CASES = [
    {
        "id": "FE01",
        "turn1": "Update the stage",
        "turn2": "Framing on Via Tesoro, mark it complete",
        "expected_tools": ["update_stage"],
    },
    {
        "id": "FE02",
        "turn1": "Create a payment",
        "turn2": "Via Tesoro, $5000, called Foundation deposit",
        "expected_tools": ["create_installment"],
    },
    {
        "id": "FE03",
        "turn1": "There's an issue",
        "turn2": "Leak in the basement at Via Tesoro, mark it critical",
        "expected_tools": ["create_issue"],
    },
]


# =============================================================================
# Eval Logic
# =============================================================================


async def _eval_should_ask(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """Agent MUST ask a question for ambiguous input."""
    result = await collect_events(agent, spec["prompt"], context)

    if result["asked_question"]:
        # Check if the question addresses the right ambiguity
        content_lower = result["content"].lower()
        keyword_hit = any(kw in content_lower for kw in spec["keywords"])
        eval_result = EvalResult.PASS if keyword_hit else EvalResult.SOFT_PASS
    else:
        eval_result = EvalResult.FAIL

    return TestCaseResult(
        case_id=spec["id"], category="should_ask", prompt=spec["prompt"],
        result=eval_result, expected_tools=[], actual_tools=result["tools_used"],
        details=f"Asked: {result['asked_question']}, Content: {result['content'][:100]}",
        asked_question=result["asked_question"],
    )


async def _eval_should_not_ask(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """Agent MUST NOT ask when intent is clear — should act directly."""
    result = await collect_events(agent, spec["prompt"], context)

    # Check that a tool was called (or confirmation requested)
    tool_called = any(t in result["tools_used"] for t in spec["expected_tools"])
    has_confirmation = result["has_confirmation"]

    if tool_called or has_confirmation:
        eval_result = EvalResult.PASS
    elif result["asked_question"]:
        eval_result = EvalResult.FAIL  # Asked when shouldn't have
    else:
        eval_result = EvalResult.SOFT_PASS  # Didn't ask but also didn't call right tool

    return TestCaseResult(
        case_id=spec["id"], category="should_not_ask", prompt=spec["prompt"],
        result=eval_result, expected_tools=spec["expected_tools"],
        actual_tools=result["tools_used"],
        details=f"Asked: {result['asked_question']}, Tools: {result['tools_used']}",
        asked_question=result["asked_question"],
    )


async def _eval_wrong_question(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """If agent asks a question, it must target the right ambiguity."""
    result = await collect_events(agent, spec["prompt"], context)

    if not result["asked_question"]:
        # Didn't ask at all — could be acceptable if it acted correctly
        return TestCaseResult(
            case_id=spec["id"], category="wrong_question", prompt=spec["prompt"],
            result=EvalResult.SOFT_PASS, expected_tools=[], actual_tools=result["tools_used"],
            details="Agent acted without asking (may be acceptable)",
            asked_question=False,
        )

    content_lower = result["content"].lower()
    right_hit = any(kw in content_lower for kw in spec["right_keywords"])
    wrong_hit = any(kw in content_lower for kw in spec["wrong_keywords"]) if spec["wrong_keywords"] else False

    if right_hit and not wrong_hit:
        eval_result = EvalResult.PASS
    elif right_hit:
        eval_result = EvalResult.SOFT_PASS  # Right + wrong
    else:
        eval_result = EvalResult.FAIL

    return TestCaseResult(
        case_id=spec["id"], category="wrong_question", prompt=spec["prompt"],
        result=eval_result, expected_tools=[], actual_tools=result["tools_used"],
        details=f"Content: {result['content'][:150]}",
        asked_question=True,
    )


async def _eval_multi_turn(
    agent: AgentOrchestrator, spec: Dict, context: Dict
) -> TestCaseResult:
    """Multi-turn: agent should ask on turn 1, then act on turn 2."""
    # Turn 1: should ask a question
    result1 = await collect_events(agent, spec["turn1"], context)
    conv_id = result1.get("conversation_id")

    if not conv_id:
        return TestCaseResult(
            case_id=spec["id"], category="multi_turn", prompt=spec["turn1"],
            result=EvalResult.FAIL, expected_tools=spec["expected_tools"],
            actual_tools=result1["tools_used"],
            details="No conversation_id returned from turn 1",
        )

    # Turn 2: provide the answer, agent should act
    result2 = await collect_events(
        agent, spec["turn2"], context, conversation_id=conv_id
    )

    tool_called = any(t in result2["tools_used"] for t in spec["expected_tools"])
    has_confirmation = result2["has_confirmation"]

    if tool_called or has_confirmation:
        eval_result = EvalResult.PASS
    else:
        eval_result = EvalResult.FAIL

    return TestCaseResult(
        case_id=spec["id"], category="multi_turn",
        prompt=f"{spec['turn1']} → {spec['turn2']}",
        result=eval_result, expected_tools=spec["expected_tools"],
        actual_tools=result2["tools_used"],
        details=f"Turn2 tools: {result2['tools_used']}, Content: {result2['content'][:100]}",
    )


# =============================================================================
# Test Class
# =============================================================================


CATEGORY_THRESHOLDS = {
    "should_ask": 0.80,
    "should_not_ask": 0.80,
    "wrong_question": 0.70,
    "multi_turn": 0.65,
}


@pytest.mark.live_llm
@pytest.mark.integration
class TestFollowUpQuestions:
    """Integration tests: follow-up question quality evaluation."""

    @pytest.mark.asyncio
    async def test_all_followup_cases(self):
        """Run all follow-up question test cases."""
        agent = AgentOrchestrator()
        context = EVAL_USERS["admin"].copy()

        results: List[TestCaseResult] = []

        # Category A: Should ask
        for spec in SHOULD_ASK_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_should_ask(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="should_ask", prompt=spec["prompt"],
                    result=EvalResult.FAIL, expected_tools=[], actual_tools=[],
                    details=f"Exception: {e}",
                ))

        # Category B: Should NOT ask
        for spec in SHOULD_NOT_ASK_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_should_not_ask(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="should_not_ask", prompt=spec["prompt"],
                    result=EvalResult.FAIL, expected_tools=spec["expected_tools"],
                    actual_tools=[], details=f"Exception: {e}",
                ))

        # Category C: Wrong question
        for spec in WRONG_QUESTION_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_wrong_question(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="wrong_question", prompt=spec["prompt"],
                    result=EvalResult.FAIL, expected_tools=[], actual_tools=[],
                    details=f"Exception: {e}",
                ))

        # Category E: Multi-turn
        for spec in MULTI_TURN_CASES:
            try:
                async def _run(s=spec):
                    return await _eval_multi_turn(agent, s, context)
                result = await run_with_retries(_run, n=2)
                results.append(result)
            except Exception as e:
                results.append(TestCaseResult(
                    case_id=spec["id"], category="multi_turn", prompt=spec["turn1"],
                    result=EvalResult.FAIL, expected_tools=spec["expected_tools"],
                    actual_tools=[], details=f"Exception: {e}",
                ))

        # Report
        print_eval_report("FOLLOW-UP QUESTION QUALITY EVAL", results, CATEGORY_THRESHOLDS)

        overall = aggregate_overall(results)
        assert overall["pass_rate"] >= 0.60, (
            f"Overall pass rate too low: {overall['pass_rate']:.0%}"
        )
