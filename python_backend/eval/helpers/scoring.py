"""
Scoring utilities for agent evaluation.

Provides enums, data classes, and functions for scoring test cases
and aggregating results across categories.
"""

import statistics
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class EvalResult(str, Enum):
    """Result of a single eval run."""
    PASS = "pass"
    SOFT_PASS = "soft_pass"
    FLAKY = "flaky"
    FAIL = "fail"


@dataclass
class TestCaseResult:
    """Result of a single test case (possibly across multiple runs)."""
    case_id: str
    category: str
    prompt: str
    result: EvalResult
    expected_tools: List[str]
    actual_tools: List[str]
    details: str = ""
    runs: int = 1
    pass_count: int = 0
    asked_question: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


def score_tool_selection(
    expected_tools: List[str],
    acceptable_alternatives: List[str],
    actual_tools: List[str],
    expect_question: bool = False,
    asked_question: bool = False,
) -> EvalResult:
    """Score a tool selection result.

    Args:
        expected_tools: Primary expected tools (exact match = PASS).
        acceptable_alternatives: Alternative tools that are acceptable (= SOFT_PASS).
        actual_tools: Tools actually selected by the agent.
        expect_question: Whether a clarifying question is an acceptable outcome.
        asked_question: Whether the agent asked a clarifying question.

    Returns:
        EvalResult score.
    """
    # If we expected a question and got one, that's a PASS
    if expect_question and asked_question:
        return EvalResult.PASS

    # If no expected tools (e.g., out-of-scope), check that no write tools were called
    if not expected_tools:
        READ_ONLY = {
            "get_projects", "get_project_detail", "get_stages", "get_tasks",
            "get_materials", "get_issues", "get_installments", "get_stage_templates",
            "query_database",
        }
        write_tools = [t for t in actual_tools if t not in READ_ONLY]
        if not write_tools:
            return EvalResult.PASS
        return EvalResult.FAIL

    # Check for exact match
    if any(tool in actual_tools for tool in expected_tools):
        return EvalResult.PASS

    # Check for acceptable alternatives
    if acceptable_alternatives and any(tool in actual_tools for tool in acceptable_alternatives):
        return EvalResult.SOFT_PASS

    # If question was asked but not expected, it's a soft pass (better than wrong tool)
    if asked_question and not expect_question:
        return EvalResult.SOFT_PASS

    return EvalResult.FAIL


def aggregate_category_results(
    results: List[TestCaseResult],
) -> Dict[str, Dict[str, Any]]:
    """Aggregate results by category.

    Returns:
        Dict mapping category name to stats:
        - total: int
        - passed: int (PASS + SOFT_PASS)
        - failed: int (FAIL + FLAKY)
        - pass_rate: float (0.0-1.0)
        - results: List[TestCaseResult]
    """
    categories: Dict[str, List[TestCaseResult]] = {}
    for r in results:
        categories.setdefault(r.category, []).append(r)

    aggregated = {}
    for category, cat_results in categories.items():
        passed = sum(
            1 for r in cat_results
            if r.result in (EvalResult.PASS, EvalResult.SOFT_PASS)
        )
        total = len(cat_results)
        aggregated[category] = {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": passed / total if total > 0 else 0.0,
            "results": cat_results,
        }

    return aggregated


def aggregate_overall(results: List[TestCaseResult]) -> Dict[str, Any]:
    """Compute overall stats across all results."""
    total = len(results)
    passed = sum(
        1 for r in results
        if r.result in (EvalResult.PASS, EvalResult.SOFT_PASS)
    )
    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": passed / total if total > 0 else 0.0,
        "by_result": {
            result_type.value: sum(1 for r in results if r.result == result_type)
            for result_type in EvalResult
        },
    }


def print_eval_report(
    title: str,
    results: List[TestCaseResult],
    thresholds: Optional[Dict[str, float]] = None,
) -> None:
    """Print a formatted eval report to stdout."""
    by_category = aggregate_category_results(results)
    overall = aggregate_overall(results)

    print(f"\n{'=' * 80}")
    print(f"  {title}")
    print(f"{'=' * 80}")
    print(f"\nOverall: {overall['passed']}/{overall['total']} "
          f"({overall['pass_rate']:.1%})")

    print(f"\nBy Category:")
    for cat, stats in by_category.items():
        threshold = thresholds.get(cat, 0) if thresholds else 0
        status = "OK" if stats["pass_rate"] >= threshold else "BELOW TARGET"
        print(f"  {cat}: {stats['passed']}/{stats['total']} "
              f"({stats['pass_rate']:.1%}) "
              f"[target: {threshold:.0%}] {status}")

    # Show failures
    failures = [r for r in results if r.result in (EvalResult.FAIL, EvalResult.FLAKY)]
    if failures:
        print(f"\nFailures ({len(failures)}):")
        for r in failures:
            print(f"  [{r.result.value}] {r.case_id}: {r.prompt[:60]}...")
            print(f"    Expected: {r.expected_tools}, Got: {r.actual_tools}")
            if r.details:
                print(f"    Details: {r.details}")

    print(f"{'=' * 80}\n")
