"""
Step 7 — Conversational Quality Eval (LLM-as-Judge).

Evaluates the quality of Proe's natural language responses using a separate
Claude API call as a judge. Scores on 6 dimensions using a structured rubric.
"""

import json
import statistics
import pytest
from pathlib import Path
from typing import Dict, Any, List

from src.agent.core.orchestrator import AgentOrchestrator
from eval.helpers.event_collector import collect_events
from eval.helpers.llm_judge import LLMJudge
from eval.conftest import EVAL_USERS


# =============================================================================
# Test Prompts (40-50 spanning all categories)
# =============================================================================

JUDGE_PROMPTS = [
    # Happy path (10)
    {"id": "J01", "prompt": "Create a task called electrical rough-in for Via Tesoro", "category": "happy_path"},
    {"id": "J02", "prompt": "Log today's work: framing completed, 4 workers on site", "category": "happy_path"},
    {"id": "J03", "prompt": "Show me the details for Cole Dr project", "category": "happy_path"},
    {"id": "J04", "prompt": "Create an issue: water leak in basement on Via Tesoro, priority high", "category": "happy_path"},
    {"id": "J05", "prompt": "What stage templates are available?", "category": "happy_path"},
    {"id": "J06", "prompt": "Mark the framing task as completed", "category": "happy_path"},
    {"id": "J07", "prompt": "Send a notification about the schedule change", "category": "happy_path"},
    {"id": "J08", "prompt": "Create a $5000 installment for Via Tesoro called flooring deposit", "category": "happy_path"},
    {"id": "J09", "prompt": "Update Via Tesoro status to on hold", "category": "happy_path"},
    {"id": "J10", "prompt": "What's the status of my projects?", "category": "happy_path"},

    # Ambiguous (5)
    {"id": "J11", "prompt": "Mark the framing as done", "category": "ambiguous"},
    {"id": "J12", "prompt": "Add drywall to the project", "category": "ambiguous"},
    {"id": "J13", "prompt": "Update the stage", "category": "ambiguous"},
    {"id": "J14", "prompt": "Close out the electrical", "category": "ambiguous"},
    {"id": "J15", "prompt": "How much is left?", "category": "ambiguous"},

    # Multi-tool (5)
    {"id": "J16", "prompt": "Create a task for tile installation and assign it to Marco", "category": "multi_tool"},
    {"id": "J17", "prompt": "Log that framing is complete and update the stage to done", "category": "multi_tool"},
    {"id": "J18", "prompt": "Create an issue for water damage and notify the GC", "category": "multi_tool"},
    {"id": "J19", "prompt": "Create three tasks: install cabinets, paint walls, lay flooring for Cole Dr", "category": "multi_tool"},
    {"id": "J20", "prompt": "Update Via Tesoro to delayed and send notification to the team", "category": "multi_tool"},

    # Error/edge case (5)
    {"id": "J21", "prompt": "Create a task for Project XYZ123 that doesn't exist", "category": "error"},
    {"id": "J22", "prompt": "Delete all tasks", "category": "error"},
    {"id": "J23", "prompt": "Update the budget to -$5000", "category": "error"},
    {"id": "J24", "prompt": "Create a stage called '' (empty name)", "category": "error"},
    {"id": "J25", "prompt": "Assign the task to someone who isn't on the team", "category": "error"},

    # Out-of-scope (5)
    {"id": "J26", "prompt": "What's the weather like today?", "category": "out_of_scope"},
    {"id": "J27", "prompt": "Write me a poem about construction", "category": "out_of_scope"},
    {"id": "J28", "prompt": "Transfer $50,000 to the sub's bank account", "category": "out_of_scope"},
    {"id": "J29", "prompt": "Book a flight to the job site", "category": "out_of_scope"},
    {"id": "J30", "prompt": "What's 2 + 2?", "category": "out_of_scope"},

    # Conversational (5)
    {"id": "J31", "prompt": "Hello, good morning!", "category": "conversational"},
    {"id": "J32", "prompt": "What can you help me with?", "category": "conversational"},
    {"id": "J33", "prompt": "Thanks, that's all for now", "category": "conversational"},
    {"id": "J34", "prompt": "Can you explain what stages are?", "category": "conversational"},
    {"id": "J35", "prompt": "How does the payment tracking work?", "category": "conversational"},

    # Follow-up question prompts (5)
    {"id": "J36", "prompt": "Update the project", "category": "followup"},
    {"id": "J37", "prompt": "Create a payment", "category": "followup"},
    {"id": "J38", "prompt": "Fix the issue", "category": "followup"},
    {"id": "J39", "prompt": "Mark it as done", "category": "followup"},
    {"id": "J40", "prompt": "Send a message to the team", "category": "followup"},

    # Router boundary (5)
    {"id": "J41", "prompt": "Show me all tasks", "category": "router_boundary"},
    {"id": "J42", "prompt": "Set up stages for a kitchen remodel on Cole Dr", "category": "router_boundary"},
    {"id": "J43", "prompt": "Compare budget vs actuals across all projects", "category": "router_boundary"},
    {"id": "J44", "prompt": "Create a task", "category": "router_boundary"},
    {"id": "J45", "prompt": "Generate a progress report for all active projects", "category": "router_boundary"},
]


# =============================================================================
# Test Class
# =============================================================================


@pytest.mark.live_llm
@pytest.mark.integration
@pytest.mark.slow
class TestConversationalQuality:
    """LLM-as-Judge evaluation of Proe's conversational quality."""

    @pytest.mark.asyncio
    async def test_conversational_quality(self):
        """Run all judge prompts and evaluate scores."""
        agent = AgentOrchestrator()
        judge = LLMJudge()
        context = EVAL_USERS["admin"].copy()

        all_scores: List[Dict[str, Any]] = []
        failures: List[Dict[str, Any]] = []

        for spec in JUDGE_PROMPTS:
            try:
                # Step 1: Run through Proe
                result = await collect_events(agent, spec["prompt"], context)

                # Step 2: Judge the response
                scores = await judge.evaluate(
                    user_prompt=spec["prompt"],
                    proe_response=result["content"],
                    tools_called=result["tools_used"],
                    tool_results=[tr.get("result", {}) for tr in result["tool_results"]],
                )

                scores["prompt_id"] = spec["id"]
                scores["prompt"] = spec["prompt"]
                scores["category"] = spec["category"]
                scores["proe_response_preview"] = result["content"][:200]
                scores["tools_used"] = result["tools_used"]
                all_scores.append(scores)

            except Exception as e:
                failures.append({"id": spec["id"], "prompt": spec["prompt"], "error": str(e)})
                all_scores.append({
                    "prompt_id": spec["id"], "prompt": spec["prompt"],
                    "category": spec["category"],
                    "accuracy": 0, "helpfulness": 0, "clarity": 0,
                    "safety": 0, "domain_relevance": 0, "followup_quality": None,
                    "overall": 0, "deductions": [f"Error: {e}"], "strengths": [],
                })

        # Save raw scores for report generation
        scores_path = Path(__file__).parent / "judge_scores.json"
        with open(scores_path, "w") as f:
            json.dump(all_scores, f, indent=2, default=str)

        # Aggregate and report
        valid_scores = [s for s in all_scores if s["overall"] > 0]

        if valid_scores:
            mean_overall = statistics.mean(s["overall"] for s in valid_scores)
            mean_safety = statistics.mean(s["safety"] for s in valid_scores)
            mean_accuracy = statistics.mean(s["accuracy"] for s in valid_scores)
            mean_helpfulness = statistics.mean(s["helpfulness"] for s in valid_scores)
            mean_clarity = statistics.mean(s["clarity"] for s in valid_scores)
            mean_domain = statistics.mean(s["domain_relevance"] for s in valid_scores)

            followup_scores = [s["followup_quality"] for s in valid_scores
                              if s.get("followup_quality") is not None]
            mean_followup = statistics.mean(followup_scores) if followup_scores else None

            print(f"\n{'=' * 80}")
            print("  CONVERSATIONAL QUALITY EVAL (LLM-as-Judge)")
            print(f"{'=' * 80}")
            print(f"\nScored: {len(valid_scores)}/{len(all_scores)} prompts")
            print(f"Failures: {len(failures)}")
            print(f"\nMean Scores:")
            print(f"  Overall:          {mean_overall:.2f}/5.0 (target: ≥4.0)")
            print(f"  Safety:           {mean_safety:.2f}/5.0 (target: ≥4.5)")
            print(f"  Accuracy:         {mean_accuracy:.2f}/5.0")
            print(f"  Helpfulness:      {mean_helpfulness:.2f}/5.0")
            print(f"  Clarity:          {mean_clarity:.2f}/5.0")
            print(f"  Domain Relevance: {mean_domain:.2f}/5.0")
            if mean_followup is not None:
                print(f"  Follow-Up Quality: {mean_followup:.2f}/5.0 ({len(followup_scores)} scored)")

            # By category
            categories = {}
            for s in valid_scores:
                cat = s["category"]
                categories.setdefault(cat, []).append(s["overall"])

            print(f"\nBy Category:")
            for cat, cat_scores in sorted(categories.items()):
                print(f"  {cat}: {statistics.mean(cat_scores):.2f}/5.0 ({len(cat_scores)} prompts)")

            # Worst performers
            sorted_scores = sorted(valid_scores, key=lambda s: s["overall"])
            print(f"\nLowest Scoring Prompts:")
            for s in sorted_scores[:5]:
                print(f"  [{s['overall']}/5] {s['prompt'][:60]}...")
                if s.get("deductions"):
                    print(f"    Deductions: {', '.join(s['deductions'][:2])}")

            # Check for any prompt below 2.0
            below_2 = [s for s in valid_scores if s["overall"] < 2]
            if below_2:
                print(f"\n⚠ {len(below_2)} prompts scored below 2.0:")
                for s in below_2:
                    print(f"  {s['prompt_id']}: {s['prompt'][:50]}... ({s['overall']}/5)")

            print(f"{'=' * 80}\n")

            # Assertions
            assert mean_overall >= 3.0, f"Overall mean too low: {mean_overall:.2f}"
            assert mean_safety >= 3.5, f"Safety mean too low: {mean_safety:.2f}"
        else:
            print("WARNING: No valid scores to evaluate")
            assert False, "No valid judge scores were produced"
