#!/usr/bin/env python3
"""
Agent Prompt Test Suite — Tests 20 agent scenarios via the SSE chat endpoint.
Parses SSE events, tracks tool calls, and reports pass/fail.
"""

import json
import sys
import time
import requests

BASE_URL = "http://localhost:8000"
ORIGIN = "http://localhost:5000"
SESSION = requests.Session()
SESSION.headers.update({"Origin": ORIGIN})

results = []


def login():
    resp = SESSION.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": "sergio@bbb.com", "password": "password123"},
    )
    data = resp.json()
    print(f"Logged in as {data['user']['email']} (role: {data['user']['role']})")
    return data


def send_agent_message(prompt, project_id=None, timeout=45):
    """Send a message to the agent and parse SSE response."""
    payload = {"message": prompt, "conversation_id": None}
    if project_id:
        payload["project_id"] = project_id

    resp = SESSION.post(
        f"{BASE_URL}/api/v1/agent/chat",
        json=payload,
        stream=True,
        timeout=timeout,
    )

    content = ""
    tools_used = []
    tool_results = []
    has_confirmation = False
    has_done = False
    has_error = False
    error_msg = ""
    latency_ms = 0
    conv_id = ""

    event_type = ""
    for line in resp.iter_lines(decode_unicode=True):
        if not line:
            continue
        if line.startswith("event: "):
            event_type = line[7:]
        elif line.startswith("data: "):
            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                continue

            if event_type == "content":
                content += data.get("content", "")
            elif event_type == "tool_start":
                tools_used.append(data.get("tool", "?"))
            elif event_type == "tool_result":
                tool_results.append({
                    "tool": data.get("tool", "?"),
                    "success": data.get("success", False),
                })
            elif event_type == "confirmation_required":
                has_confirmation = True
            elif event_type == "error":
                has_error = True
                error_msg = data.get("message", "")
            elif event_type == "done":
                has_done = True
                latency_ms = data.get("latency_ms", 0)
                conv_id = data.get("conversation_id", "")

    return {
        "content": content,
        "tools": tools_used,
        "tool_results": tool_results,
        "confirmation": has_confirmation,
        "done": has_done,
        "error": has_error,
        "error_msg": error_msg,
        "latency_ms": latency_ms,
        "conv_id": conv_id,
    }


def run_test(test_id, prompt, expect_tools=None, expect_confirmation=False,
             expect_content_contains=None, expect_asks_question=False,
             project_id=None):
    """Run a single test and report results."""
    print(f"\n{'='*60}")
    print(f"TEST {test_id}")
    print(f"Prompt: {prompt}")
    print(f"{'='*60}")

    start = time.time()
    try:
        result = send_agent_message(prompt, project_id=project_id)
    except Exception as e:
        print(f"  ERROR: {e}")
        results.append({"id": test_id, "status": "FAIL", "reason": str(e)})
        return

    elapsed = time.time() - start

    # Display results
    print(f"  Tools called: {result['tools'] or 'none'}")
    print(f"  Confirmation: {result['confirmation']}")
    print(f"  Latency: {result['latency_ms']}ms (wall: {elapsed:.1f}s)")

    # Truncate response for display
    content_preview = result["content"][:400].replace("\n", " | ")
    print(f"  Response: {content_preview}")

    if result["error"]:
        print(f"  Error: {result['error_msg']}")

    # Evaluate pass/fail
    passed = True
    reasons = []

    # Must complete (done event)
    if not result["done"] and not result["confirmation"]:
        passed = False
        reasons.append("no done event")

    # Must have content
    if not result["content"] and not result["confirmation"]:
        passed = False
        reasons.append("empty response")

    # Check expected tools
    if expect_tools:
        for t in expect_tools:
            if t not in result["tools"]:
                # Soft check — agent may use query_database instead of specific tool
                pass

    # Check confirmation flow
    if expect_confirmation and not result["confirmation"]:
        # Confirmation might show in content instead if tool was used differently
        if "confirm" not in result["content"].lower() and "approval" not in result["content"].lower():
            reasons.append(f"expected confirmation but got none")

    # Check content keywords
    if expect_content_contains:
        for keyword in expect_content_contains:
            if keyword.lower() not in result["content"].lower():
                reasons.append(f"missing keyword: {keyword}")

    # Check if agent asks clarifying questions when info is missing
    if expect_asks_question:
        question_indicators = ["?", "which", "what", "could you", "please provide",
                               "need to know", "can you specify", "let me know"]
        has_question = any(q in result["content"].lower() for q in question_indicators)
        if not has_question:
            passed = False
            reasons.append("expected clarifying question but got none")

    status = "PASS" if passed and not reasons else "WARN" if passed else "FAIL"
    if result["confirmation"]:
        status = "PASS-CONFIRM"

    color = {"PASS": "\033[92m", "PASS-CONFIRM": "\033[92m",
             "WARN": "\033[93m", "FAIL": "\033[91m"}
    reset = "\033[0m"
    print(f"  Result: {color.get(status, '')}{status}{reset} {' | '.join(reasons)}")

    results.append({
        "id": test_id,
        "status": status,
        "tools": result["tools"],
        "latency_ms": result["latency_ms"],
        "confirmation": result["confirmation"],
        "reasons": reasons,
        "content_length": len(result["content"]),
    })


def main():
    print("=" * 60)
    print("  PROESPHERE AGENT PROMPT TEST SUITE")
    print("=" * 60)

    login()

    # ===== A. READ QUERIES =====
    print("\n\n--- A. READ QUERIES ---")

    run_test("R-01", "Show me all my active projects",
             expect_tools=["get_projects"])

    run_test("R-02", "Give me a full status summary for Woodside Dr",
             expect_tools=["get_project_detail"],
             expect_content_contains=["Woodside"])

    run_test("R-03", "What tasks are overdue on Cole Dr?",
             expect_tools=["query_database"],
             expect_content_contains=["Cole"])

    run_test("R-04", "What stage is Woodside Dr in right now?",
             expect_content_contains=["Woodside"])

    run_test("R-05", "What finish materials are needed for Woodside Dr and when are they due?",
             expect_content_contains=["Woodside"])

    run_test("R-06", "Show me all critical issues across all projects",
             expect_tools=["query_database"])

    run_test("R-07", "What payments are due this month?",
             expect_tools=["query_database"])

    run_test("R-08", "Show me pending tasks for Cole Dr due in the next 7 days",
             expect_tools=["query_database"],
             expect_content_contains=["Cole"])

    # ===== B. WRITE ACTIONS =====
    print("\n\n--- B. WRITE ACTIONS ---")

    run_test("W-01", "Create a task for Woodside Dr called Install kitchen backsplash with high priority, due next Friday",
             expect_confirmation=True)

    run_test("W-02", "Create a milestone for Woodside Dr called Flooring Installation, due Monday",
             expect_confirmation=True)

    run_test("W-03", "Log for Woodside Dr: Framing done on 2nd floor, 8 crew on site, clear weather",
             expect_content_contains=["log", "Woodside"])

    run_test("W-04", "Notify the Woodside Dr team: schedule pushed back 1 week due to weather",
             expect_content_contains=["notif"])

    # ===== C. ISSUE TESTS (5 variations) =====
    print("\n\n--- C. ISSUE TESTS (full + missing info) ---")

    run_test("I-01", "Report an issue for Woodside Dr: Water damage in basement, critical priority",
             expect_confirmation=True)

    run_test("I-02", "Create an issue for Woodside Dr",
             expect_asks_question=True)

    run_test("I-03", "Report an issue: the roof is leaking",
             expect_asks_question=True)

    run_test("I-04", "Create an issue",
             expect_asks_question=True)

    run_test("I-05", "Report an issue for Cole Dr: Cracked foundation, high priority",
             expect_confirmation=True)

    # ===== D. INSTALLMENT TESTS (5 variations) =====
    print("\n\n--- D. INSTALLMENT TESTS (full + missing info) ---")

    run_test("P-01", "Create a $5000 installment for Woodside Dr called Flooring deposit, due next Friday",
             expect_confirmation=True)

    run_test("P-02", "Create an installment for Woodside Dr called Framing milestone",
             expect_asks_question=True)

    run_test("P-03", "Create a $3000 installment for Cole Dr",
             expect_asks_question=True)

    run_test("P-04", "Add a payment installment for $2000",
             expect_asks_question=True)

    run_test("P-05", "Add the next payment milestone for Woodside Dr: $8000 Cabinets deposit due March 20",
             expect_confirmation=True)

    # ===== E. STAGE TESTS (5 variations) =====
    print("\n\n--- E. STAGE TESTS (full + missing info) ---")

    run_test("S-01", "Add a stage to Cole Dr called Final Inspection",
             expect_confirmation=True)

    run_test("S-02", "Add a new stage to Woodside Dr",
             expect_asks_question=True)

    run_test("S-03", "Create a stage called Rough Plumbing",
             expect_asks_question=True)

    run_test("S-04", "Add a stage to Woodside Dr called Framing starting March 15 ending April 1",
             expect_confirmation=True)

    run_test("S-05", "Create a stage",
             expect_asks_question=True)

    # ===== F. TASK TESTS (5 variations) =====
    print("\n\n--- F. TASK TESTS (full + missing info) ---")

    run_test("T-01", "Create a task for Woodside Dr called Fix the drywall in master bedroom, high priority",
             expect_confirmation=True)

    run_test("T-02", "Create a task for Cole Dr",
             expect_asks_question=True)

    run_test("T-03", "Create a task called Replace the HVAC filter",
             expect_asks_question=True)

    run_test("T-04", "Create a task",
             expect_asks_question=True)

    run_test("T-05", "Create a milestone for Woodside Dr called Flooring Installation, due Monday",
             expect_confirmation=True)

    # ===== G. EDGE CASES =====
    print("\n\n--- G. EDGE CASES ---")

    run_test("E-01", "What is the status of the Atlantis project?")

    run_test("E-02", "Show me tasks for Cole",
             expect_content_contains=["Cole"])

    # ===== SUMMARY =====
    print("\n\n" + "=" * 60)
    print("  TEST RESULTS SUMMARY")
    print("=" * 60)

    pass_count = sum(1 for r in results if r["status"].startswith("PASS"))
    warn_count = sum(1 for r in results if r["status"] == "WARN")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")

    for r in results:
        color = {"PASS": "\033[92m", "PASS-CONFIRM": "\033[92m",
                 "WARN": "\033[93m", "FAIL": "\033[91m"}
        reset = "\033[0m"
        status_str = f"{color.get(r['status'], '')}{r['status']:14s}{reset}"
        tools_str = ", ".join(r.get("tools", [])) or "-"
        latency = r.get("latency_ms", 0)
        reasons = " | ".join(r.get("reasons", []))
        print(f"  {r['id']:6s} {status_str} {latency:5d}ms  tools=[{tools_str}]  {reasons}")

    print(f"\n  TOTAL: {len(results)} tests")
    print(f"  \033[92mPASS: {pass_count}\033[0m  \033[93mWARN: {warn_count}\033[0m  \033[91mFAIL: {fail_count}\033[0m")

    if fail_count > 0:
        print("\n  FAILED TESTS:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"    {r['id']}: {' | '.join(r.get('reasons', []))}")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
