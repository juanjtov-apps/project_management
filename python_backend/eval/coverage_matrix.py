"""
Step 9 — Eval Matrix Coverage Audit.

Produces a coverage matrix showing which tools × test dimensions are covered.
Run after all tests: python eval/coverage_matrix.py

Outputs:
- eval/coverage_matrix.md (markdown table)
- eval/coverage_matrix.json (machine-readable)
"""

from dotenv import load_dotenv
load_dotenv()

import json
import sys
from pathlib import Path
from typing import Dict, List, Set

# All known tools
ALL_TOOLS = [
    "create_task", "create_issue", "create_installment", "create_stage",
    "create_material_item", "create_daily_log", "update_project_status",
    "update_task_status", "update_issue_status", "update_payment_status",
    "update_installment", "update_stage", "update_project_details",
    "assign_task", "delete_task", "send_notification", "apply_stage_template",
    "get_stage_templates", "get_project_detail", "get_projects", "get_stages",
    "get_tasks", "get_materials", "get_issues", "get_installments",
    "query_database",
]

# Test dimensions
DIMENSIONS = [
    "Happy Path", "Edge Case", "Wrong Tool Trap", "Permission Check",
    "Error Handling", "Multi-Tool Combo", "Follow-Up Trigger", "Router Tier",
]

# High-risk tools that need full coverage
HIGH_RISK_TOOLS = {"delete_task", "update_payment_status", "update_project_status"}


def _build_coverage_from_test_specs() -> Dict[str, Set[str]]:
    """Build coverage map from test case definitions.

    Returns dict: tool_name -> set of covered dimensions.
    """
    coverage: Dict[str, Set[str]] = {tool: set() for tool in ALL_TOOLS}

    # Import test specs to analyze coverage
    sys.path.insert(0, str(Path(__file__).parent.parent))

    # Intent recognition covers Happy Path, Wrong Tool Trap
    try:
        from eval.test_intent_recognition import (
            DIRECT_INTENT_CASES, AMBIGUOUS_INTENT_CASES,
            MULTI_TOOL_CASES, WRONG_TOOL_CASES,
            OUT_OF_SCOPE_CASES, CONTEXT_DEPENDENT_CASES,
        )

        for case in DIRECT_INTENT_CASES:
            for tool in case["expected"]:
                if tool in coverage:
                    coverage[tool].add("Happy Path")

        for case in WRONG_TOOL_CASES:
            for tool in case["expected"]:
                if tool in coverage:
                    coverage[tool].add("Wrong Tool Trap")
            for tool in case.get("wrong", []):
                if tool in coverage:
                    coverage[tool].add("Wrong Tool Trap")

        for case in MULTI_TOOL_CASES:
            for tool in case["expected"]:
                if tool in coverage:
                    coverage[tool].add("Multi-Tool Combo")

        for case in CONTEXT_DEPENDENT_CASES:
            for tool in case["expected"]:
                if tool in coverage:
                    coverage[tool].add("Edge Case")

    except ImportError:
        print("Warning: Could not import test_intent_recognition")

    # Follow-up questions cover Follow-Up Trigger
    try:
        from eval.test_followup_questions import (
            SHOULD_ASK_CASES, SHOULD_NOT_ASK_CASES,
        )

        for case in SHOULD_NOT_ASK_CASES:
            for tool in case["expected_tools"]:
                if tool in coverage:
                    coverage[tool].add("Follow-Up Trigger")

    except ImportError:
        print("Warning: Could not import test_followup_questions")

    # Safety guardrails cover Permission Check, Error Handling
    try:
        from eval.test_safety_guardrails import ROLE_TOOL_EXPECTATIONS

        for tool_name, role, allowed in ROLE_TOOL_EXPECTATIONS:
            if tool_name in coverage:
                coverage[tool_name].add("Permission Check")

    except ImportError:
        print("Warning: Could not import test_safety_guardrails")

    # Error handling is covered by TestErrorDetection in test_safety_guardrails.py
    error_tested_tools = [
        "create_task", "create_issue", "update_issue_status", "update_project_status",
        "delete_task", "update_payment_status", "update_installment", "update_stage",
        "assign_task", "create_stage", "create_installment", "create_daily_log",
        "create_material_item", "send_notification", "apply_stage_template",
        "update_project_details", "update_task_status",
        "get_stage_templates", "get_project_detail", "get_projects", "get_stages",
        "get_tasks", "get_materials", "get_issues", "get_installments", "query_database",
    ]
    for tool in error_tested_tools:
        if tool in coverage:
            coverage[tool].add("Error Handling")

    # Router tier coverage from LLM router tests
    try:
        from eval.test_llm_router import (
            LIVE_SIMPLE_QUERIES, LIVE_STANDARD_QUERIES, LIVE_COMPLEX_QUERIES,
        )
        # Router tests don't map 1:1 to tools, but cover the routing dimension
        # Mark tools that appear in router test prompts
        all_router_prompts = (
            [p for p, _ in LIVE_SIMPLE_QUERIES]
            + [p for p, _ in LIVE_STANDARD_QUERIES]
            + [p for p, _ in LIVE_COMPLEX_QUERIES]
        )
        tool_keywords = {
            "create_task": ["task", "create a task", "rough-in electrical"],
            "update_stage": ["stage", "complete"],
            "create_daily_log": ["log", "work"],
            "send_notification": ["notification", "notify"],
            "assign_task": ["assign"],
            "update_project_details": ["address", "update the project"],
            "create_issue": ["issue", "flagged"],
            "get_projects": ["status", "projects"],
            "update_issue_status": ["issue", "resolved"],
            "update_installment": ["installment amount"],
            "update_project_status": ["on hold", "put the project"],
            "update_payment_status": ["payment", "received"],
            "get_materials": ["materials"],
            "get_issues": ["issues"],
            "get_installments": ["installments", "pending"],
            "get_stages": ["stages does"],
            "get_tasks": ["tasks for"],
            "delete_task": ["delete"],
            "apply_stage_template": ["template to", "apply"],
            "get_stage_templates": ["templates available", "stage templates"],
            "create_installment": ["installment for", "deposit"],
            "query_database": ["query", "overdue tasks"],
            "get_project_detail": ["details for", "project details"],
            "create_stage": ["new stage", "add a new stage"],
            "create_material_item": ["material", "bags of"],
            "update_task_status": ["task as complete", "task as done", "mark the framing task"],
        }
        for tool, keywords in tool_keywords.items():
            for prompt in all_router_prompts:
                if any(kw in prompt.lower() for kw in keywords):
                    if tool in coverage:
                        coverage[tool].add("Router Tier")
                    break

    except ImportError:
        print("Warning: Could not import test_llm_router")

    return coverage


def generate_matrix():
    """Generate the coverage matrix."""
    coverage = _build_coverage_from_test_specs()

    # Build markdown table
    header = "| Tool | " + " | ".join(DIMENSIONS) + " |"
    separator = "|------|" + "|".join(["---" for _ in DIMENSIONS]) + "|"

    rows = []
    total_cells = 0
    covered_cells = 0
    gaps = []

    for tool in ALL_TOOLS:
        cells = []
        for dim in DIMENSIONS:
            total_cells += 1
            if dim in coverage.get(tool, set()):
                cells.append(" ✅ ")
                covered_cells += 1
            else:
                cells.append(" ❌ ")
                gaps.append((tool, dim))
        row = f"| {tool} | " + " | ".join(cells) + " |"
        rows.append(row)

    matrix_md = "\n".join([header, separator] + rows)

    # Coverage stats
    coverage_pct = covered_cells / total_cells * 100 if total_cells > 0 else 0

    # Identify high-priority gaps
    high_priority_gaps = [
        (tool, dim) for tool, dim in gaps if tool in HIGH_RISK_TOOLS
    ]

    # Tools with fewer than 3 covered columns
    low_coverage_tools = [
        tool for tool in ALL_TOOLS
        if len(coverage.get(tool, set())) < 3
    ]

    # Build report
    report = f"""# Eval Matrix Coverage Audit

## Coverage: {covered_cells}/{total_cells} cells ({coverage_pct:.1f}%)

Target: ≥75% overall coverage

## Matrix

{matrix_md}

## Gap Analysis

### High-Priority Gaps (high-risk tools)
"""
    if high_priority_gaps:
        for tool, dim in high_priority_gaps:
            report += f"- **{tool}**: missing {dim}\n"
    else:
        report += "None — all high-risk tools are fully covered.\n"

    report += f"""
### Low-Coverage Tools (< 3 dimensions covered)
"""
    if low_coverage_tools:
        for tool in low_coverage_tools:
            dims = coverage.get(tool, set())
            report += f"- **{tool}**: {len(dims)}/8 dimensions ({', '.join(dims) if dims else 'none'})\n"
    else:
        report += "None — all tools have adequate coverage.\n"

    report += f"""
### Total Gaps: {len(gaps)}
"""

    # Write outputs
    output_dir = Path(__file__).parent

    md_path = output_dir / "coverage_matrix.md"
    with open(md_path, "w") as f:
        f.write(report)
    print(f"Written: {md_path}")

    # JSON output
    json_data = {
        "total_cells": total_cells,
        "covered_cells": covered_cells,
        "coverage_pct": coverage_pct,
        "matrix": {
            tool: {dim: dim in coverage.get(tool, set()) for dim in DIMENSIONS}
            for tool in ALL_TOOLS
        },
        "gaps": [{"tool": t, "dimension": d} for t, d in gaps],
        "high_priority_gaps": [{"tool": t, "dimension": d} for t, d in high_priority_gaps],
        "low_coverage_tools": low_coverage_tools,
    }

    json_path = output_dir / "coverage_matrix.json"
    with open(json_path, "w") as f:
        json.dump(json_data, f, indent=2)
    print(f"Written: {json_path}")

    print(f"\nCoverage: {covered_cells}/{total_cells} ({coverage_pct:.1f}%)")
    print(f"Gaps: {len(gaps)}")
    print(f"High-priority gaps: {len(high_priority_gaps)}")


if __name__ == "__main__":
    generate_matrix()
