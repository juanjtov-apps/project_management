"""
Step 11 — Final Report Generation.

Aggregates all evaluation results into a consolidated EVAL_REPORT.md.
Run after all tests: python eval/generate_report.py

Prerequisites:
  1. Run pytest with JUnit XML: pytest eval/ -v --junitxml=eval/results.xml
  2. Run coverage matrix: python eval/coverage_matrix.py
  3. Judge scores saved by test_conversational_quality.py
"""

import json
import statistics
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def _parse_junit_xml(xml_path: Path) -> Dict[str, Any]:
    """Parse pytest JUnit XML output."""
    if not xml_path.exists():
        return {"available": False}

    tree = ET.parse(xml_path)
    root = tree.getroot()

    suites = root.findall(".//testsuite")
    total_tests = 0
    total_failures = 0
    total_errors = 0

    test_files = {}
    for suite in suites:
        total_tests += int(suite.get("tests", 0))
        total_failures += int(suite.get("failures", 0))
        total_errors += int(suite.get("errors", 0))

        for testcase in suite.findall("testcase"):
            classname = testcase.get("classname", "unknown")
            name = testcase.get("name", "unknown")
            time_taken = float(testcase.get("time", 0))
            failure = testcase.find("failure")
            error = testcase.find("error")
            skipped = testcase.find("skipped")

            status = "passed"
            if failure is not None:
                status = "failed"
            elif error is not None:
                status = "error"
            elif skipped is not None:
                status = "skipped"

            file_key = classname.split(".")[0] if "." in classname else classname
            test_files.setdefault(file_key, []).append({
                "name": name, "status": status, "time": time_taken,
            })

    return {
        "available": True,
        "total": total_tests,
        "failures": total_failures,
        "errors": total_errors,
        "passed": total_tests - total_failures - total_errors,
        "pass_rate": (total_tests - total_failures - total_errors) / total_tests if total_tests > 0 else 0,
        "test_files": test_files,
    }


def _load_judge_scores(scores_path: Path) -> Optional[List[Dict]]:
    """Load LLM-as-Judge scores."""
    if not scores_path.exists():
        return None
    with open(scores_path) as f:
        return json.load(f)


def _load_coverage_matrix(json_path: Path) -> Optional[Dict]:
    """Load coverage matrix JSON."""
    if not json_path.exists():
        return None
    with open(json_path) as f:
        return json.load(f)


def _get_git_hash() -> str:
    """Get current git commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=str(Path(__file__).parent.parent.parent),
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def generate_report():
    """Generate the final eval report."""
    eval_dir = Path(__file__).parent

    # Load data
    junit = _parse_junit_xml(eval_dir / "results.xml")
    judge_scores = _load_judge_scores(eval_dir / "judge_scores.json")
    coverage = _load_coverage_matrix(eval_dir / "coverage_matrix.json")

    git_hash = _get_git_hash()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Build report
    report = f"""# Proe Agent — Evaluation Report

**Date**: {timestamp}
**Evaluator**: Claude Code
**Codebase Version**: {git_hash}

---

## Executive Summary

"""

    if junit.get("available"):
        report += f"""- **Overall test results**: {junit['passed']}/{junit['total']} passed ({junit['pass_rate']:.0%})
- **Failures**: {junit['failures']}
- **Errors**: {junit['errors']}
"""
    else:
        report += "- JUnit XML results not available. Run: `pytest eval/ --junitxml=eval/results.xml`\n"

    if coverage:
        report += f"- **Coverage matrix**: {coverage['covered_cells']}/{coverage['total_cells']} cells ({coverage['coverage_pct']:.1f}%)\n"
        report += f"- **Coverage gaps**: {len(coverage['gaps'])} uncovered cells\n"

    if judge_scores:
        valid = [s for s in judge_scores if s.get("overall", 0) > 0]
        if valid:
            mean_overall = statistics.mean(s["overall"] for s in valid)
            mean_safety = statistics.mean(s["safety"] for s in valid)
            report += f"- **Conversational quality**: {mean_overall:.2f}/5.0 mean overall\n"
            report += f"- **Safety score**: {mean_safety:.2f}/5.0 mean safety\n"

    # Section: Test Results by File
    report += """
---

## Test Results by File

"""
    if junit.get("available"):
        for file_key, tests in junit.get("test_files", {}).items():
            passed = sum(1 for t in tests if t["status"] == "passed")
            failed = sum(1 for t in tests if t["status"] == "failed")
            report += f"### {file_key}\n"
            report += f"- Passed: {passed}, Failed: {failed}, Total: {len(tests)}\n"
            failures_list = [t for t in tests if t["status"] == "failed"]
            if failures_list:
                report += "- **Failures**:\n"
                for t in failures_list:
                    report += f"  - {t['name']}\n"
            report += "\n"

    # Section: Conversational Quality
    report += """---

## Conversational Quality (LLM-as-Judge)

"""
    if judge_scores:
        valid = [s for s in judge_scores if s.get("overall", 0) > 0]
        if valid:
            dims = ["accuracy", "helpfulness", "clarity", "safety", "domain_relevance"]
            report += "| Dimension | Mean Score | Target |\n"
            report += "|-----------|-----------|--------|\n"
            for dim in dims:
                mean_val = statistics.mean(s[dim] for s in valid)
                target = "≥4.5" if dim == "safety" else "≥4.0"
                report += f"| {dim.replace('_', ' ').title()} | {mean_val:.2f} | {target} |\n"

            mean_overall = statistics.mean(s["overall"] for s in valid)
            report += f"| **Overall** | **{mean_overall:.2f}** | **≥4.0** |\n"

            # Lowest scoring
            sorted_valid = sorted(valid, key=lambda s: s["overall"])
            report += "\n### Lowest-Scoring Prompts\n\n"
            for s in sorted_valid[:5]:
                report += f"- [{s['overall']}/5] {s.get('prompt', 'N/A')[:60]}\n"
                if s.get("deductions"):
                    report += f"  - Deductions: {', '.join(str(d) for d in s['deductions'][:2])}\n"
        else:
            report += "No valid judge scores available.\n"
    else:
        report += "Judge scores not available. Run: `pytest eval/test_conversational_quality.py`\n"

    # Section: Coverage Matrix
    report += """
---

## Coverage Matrix

"""
    if coverage:
        report += f"Coverage: {coverage['covered_cells']}/{coverage['total_cells']} ({coverage['coverage_pct']:.1f}%)\n\n"

        if coverage.get("high_priority_gaps"):
            report += "### High-Priority Gaps (high-risk tools)\n\n"
            for gap in coverage["high_priority_gaps"]:
                report += f"- **{gap['tool']}**: missing {gap['dimension']}\n"
            report += "\n"

        if coverage.get("low_coverage_tools"):
            report += "### Low-Coverage Tools (< 3 dimensions)\n\n"
            for tool in coverage["low_coverage_tools"]:
                report += f"- {tool}\n"
            report += "\n"

        report += "See `eval/coverage_matrix.md` for the full matrix.\n"
    else:
        report += "Coverage matrix not available. Run: `python eval/coverage_matrix.py`\n"

    # Section: Observability
    report += """
---

## Observability & Dashboard Readiness

"""
    obs_spec = eval_dir / "observability_spec.md"
    dash_spec = eval_dir / "dashboard_spec.md"
    api_schema = eval_dir / "dashboard_api_schema.py"
    component_tree = eval_dir / "dashboard_component_tree.md"

    report += f"- Observability spec: {'✅ Produced' if obs_spec.exists() else '❌ Not yet'}\n"
    report += f"- Dashboard spec: {'✅ Produced' if dash_spec.exists() else '❌ Not yet'}\n"
    report += f"- API endpoint definitions: {'✅ Produced' if api_schema.exists() else '❌ Not yet'}\n"
    report += f"- Component tree: {'✅ Produced' if component_tree.exists() else '❌ Not yet'}\n"

    # Section: Recommendations
    report += """
---

## Recommendations (Priority Ordered)

1. Close coverage gaps for high-risk tools (delete_task, update_payment_status)
2. Add edge case tests for tools with only Happy Path coverage
3. Implement observability instrumentation (see observability_spec.md)
4. Build the agent health dashboard (see dashboard_spec.md)
5. Set up weekly eval suite runs to track score trends
6. Add regression tests for any new bugs found during evaluation
"""

    # Write report
    report_path = eval_dir / "EVAL_REPORT.md"
    with open(report_path, "w") as f:
        f.write(report)
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    generate_report()
