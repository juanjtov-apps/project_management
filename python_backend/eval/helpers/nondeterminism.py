"""
Multi-run executor for handling LLM non-determinism.

Runs eval functions multiple times and aggregates results to produce
stable scores despite inherent LLM randomness.
"""

import asyncio
import logging
from typing import Any, Callable, Coroutine, Dict, List

from .scoring import EvalResult, TestCaseResult

logger = logging.getLogger(__name__)


async def run_with_retries(
    eval_fn: Callable[[], Coroutine[Any, Any, TestCaseResult]],
    n: int = 3,
    pass_threshold: float = 0.67,
) -> TestCaseResult:
    """Run an eval function N times and aggregate the result.

    Args:
        eval_fn: Async function that returns a TestCaseResult.
        n: Number of times to run (default 3).
        pass_threshold: Fraction of runs that must pass for SOFT_PASS (default 2/3).

    Returns:
        Aggregated TestCaseResult with:
        - PASS if all runs pass
        - SOFT_PASS if >= pass_threshold fraction pass
        - FLAKY if at least 1 passes but below threshold
        - FAIL if no runs pass
    """
    results: List[TestCaseResult] = []

    for i in range(n):
        try:
            result = await eval_fn()
            results.append(result)
        except Exception as e:
            logger.warning(f"Run {i+1}/{n} failed with exception: {e}")
            # Create a FAIL result for this run
            results.append(TestCaseResult(
                case_id=f"error_run_{i}",
                category="error",
                prompt="",
                result=EvalResult.FAIL,
                expected_tools=[],
                actual_tools=[],
                details=f"Exception: {e}",
                runs=1,
                pass_count=0,
            ))

    if not results:
        return TestCaseResult(
            case_id="no_results",
            category="error",
            prompt="",
            result=EvalResult.FAIL,
            expected_tools=[],
            actual_tools=[],
            details="No runs completed",
            runs=n,
            pass_count=0,
        )

    # Count passes
    pass_count = sum(
        1 for r in results
        if r.result in (EvalResult.PASS, EvalResult.SOFT_PASS)
    )
    pass_rate = pass_count / n

    # Use the first result as the template
    base = results[0]

    # Determine aggregated result
    if pass_count == n:
        aggregated_result = EvalResult.PASS
    elif pass_rate >= pass_threshold:
        aggregated_result = EvalResult.SOFT_PASS
    elif pass_count > 0:
        aggregated_result = EvalResult.FLAKY
    else:
        aggregated_result = EvalResult.FAIL

    # Collect all actual tools across runs for reporting
    all_tools = []
    for r in results:
        all_tools.extend(r.actual_tools)
    unique_tools = list(set(all_tools))

    return TestCaseResult(
        case_id=base.case_id,
        category=base.category,
        prompt=base.prompt,
        result=aggregated_result,
        expected_tools=base.expected_tools,
        actual_tools=unique_tools,
        details=f"{pass_count}/{n} runs passed. {base.details}",
        runs=n,
        pass_count=pass_count,
        asked_question=any(r.asked_question for r in results),
        metadata={"individual_results": [r.result.value for r in results]},
    )
