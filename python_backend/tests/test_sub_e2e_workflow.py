"""
Subcontractor Module E2E Workflow Test.

Tests EVERY functionality of the subcontractor module end-to-end:
1.  Create a test company, PM user, and project
2.  Create a subcontractor company
3.  Invite a sub user (magic link generated)
4.  Verify the magic link works (sub login)
5.  Create a checklist template
6.  Create a sub task as PM
7.  Create a checklist on the task
8.  Apply template to another task
9.  Sub views their assigned tasks (my-tasks)
10. Sub views task detail with checklists
11. Sub marks task as in_progress
12. Sub completes checklist items
13. Sub uploads documents to doc_required items
14. Sub submits task for review
15. PM views review queue
16. PM rejects with feedback (revision_requested)
17. Sub resubmits after revision
18. PM approves task
19. Create payment milestone (with linked tasks)
20. Verify milestone auto-payable
21. Create milestone without linked tasks (manual)
22. Admin marks milestone as paid
23. Sub views their milestones
24. Calculate performance scores
25. Sub views their performance
26. PM views performance dashboard
27. Sub views their projects (my-projects)
28. Verify sub CANNOT see other sub's tasks (security)
29. Verify sub CANNOT access PM-only endpoints (RBAC)
30. Cleanup test data
"""

import asyncio
import asyncpg
import bcrypt
import uuid
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Test data IDs
TEST_ID = str(uuid.uuid4())[:8]
COMPANY_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())
PM_USER_ID = str(uuid.uuid4())
SUB_USER_A_ID = str(uuid.uuid4())
SUB_USER_B_ID = str(uuid.uuid4())
SUB_COMPANY_A_ID = str(uuid.uuid4())
SUB_COMPANY_B_ID = str(uuid.uuid4())

PM_EMAIL = f"e2e_sub_{TEST_ID}_pm@test.com"
PM_PASSWORD = "TestPassword123!"
SUB_A_EMAIL = f"e2e_sub_{TEST_ID}_suba@test.com"
SUB_B_EMAIL = f"e2e_sub_{TEST_ID}_subb@test.com"

PASS_COUNT = 0
FAIL_COUNT = 0
RESULTS = []


def log_result(test_name: str, passed: bool, detail: str = ""):
    global PASS_COUNT, FAIL_COUNT
    if passed:
        PASS_COUNT += 1
        status = "PASS"
    else:
        FAIL_COUNT += 1
        status = "FAIL"
    msg = f"  [{status}] {test_name}"
    if detail:
        msg += f" -- {detail}"
    print(msg)
    RESULTS.append((test_name, passed, detail))


async def setup_test_data(conn):
    """Create test company, PM user, project, and two sub companies + users."""
    # Create company
    await conn.execute(
        "INSERT INTO companies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        COMPANY_ID, f"E2E Sub Test Co {TEST_ID}",
    )

    # Get role IDs
    pm_role = await conn.fetchrow("SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'project_manager'")
    sub_role = await conn.fetchrow("SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'subcontractor'")
    admin_role = await conn.fetchrow("SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'admin'")
    pm_role_id = pm_role["id"] if pm_role else 3
    sub_role_id = sub_role["id"] if sub_role else 6
    admin_role_id = admin_role["id"] if admin_role else 1

    # Create PM user
    pw_hash = bcrypt.hashpw(PM_PASSWORD.encode(), bcrypt.gensalt()).decode()
    await conn.execute(
        """INSERT INTO users (id, email, username, first_name, last_name, password,
           role_id, company_id, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())""",
        PM_USER_ID, PM_EMAIL, PM_EMAIL, "PM", "Tester", pw_hash, pm_role_id, COMPANY_ID,
    )

    # Create project
    await conn.execute(
        """INSERT INTO projects (id, name, company_id, status, created_at, updated_at)
           VALUES ($1,$2,$3,'active',NOW(),NOW())""",
        PROJECT_ID, f"E2E Sub Test Project {TEST_ID}", COMPANY_ID,
    )

    # Create two sub companies
    await conn.execute(
        """INSERT INTO subcontractors (id, company_id, name, trade, contact_email, status)
           VALUES ($1,$2,$3,$4,$5,'active')""",
        SUB_COMPANY_A_ID, COMPANY_ID, f"Alpha Plumbing {TEST_ID}", "Plumbing", SUB_A_EMAIL,
    )
    await conn.execute(
        """INSERT INTO subcontractors (id, company_id, name, trade, contact_email, status)
           VALUES ($1,$2,$3,$4,$5,'active')""",
        SUB_COMPANY_B_ID, COMPANY_ID, f"Beta Electric {TEST_ID}", "Electrical", SUB_B_EMAIL,
    )

    # Create two sub users
    await conn.execute(
        """INSERT INTO users (id, email, username, first_name, last_name,
           role_id, company_id, subcontractor_id, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())""",
        SUB_USER_A_ID, SUB_A_EMAIL, SUB_A_EMAIL, "Alice", "SubA", sub_role_id, COMPANY_ID, SUB_COMPANY_A_ID,
    )
    await conn.execute(
        """INSERT INTO users (id, email, username, first_name, last_name,
           role_id, company_id, subcontractor_id, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())""",
        SUB_USER_B_ID, SUB_B_EMAIL, SUB_B_EMAIL, "Bob", "SubB", sub_role_id, COMPANY_ID, SUB_COMPANY_B_ID,
    )

    # Create assignments
    await conn.execute(
        """INSERT INTO subcontractor_assignments
           (id, subcontractor_id, project_id, assigned_by, sub_company_id, status, specialization)
           VALUES ($1,$2,$3,$4,$5,'active','Plumbing')""",
        str(uuid.uuid4()), SUB_USER_A_ID, PROJECT_ID, PM_USER_ID, SUB_COMPANY_A_ID,
    )
    await conn.execute(
        """INSERT INTO subcontractor_assignments
           (id, subcontractor_id, project_id, assigned_by, sub_company_id, status, specialization)
           VALUES ($1,$2,$3,$4,$5,'active','Electrical')""",
        str(uuid.uuid4()), SUB_USER_B_ID, PROJECT_ID, PM_USER_ID, SUB_COMPANY_B_ID,
    )

    print(f"  Test data created: company={COMPANY_ID[:8]}, project={PROJECT_ID[:8]}")
    print(f"  PM: {PM_EMAIL} / {PM_PASSWORD}")
    print(f"  Sub A: {SUB_A_EMAIL} (company: Alpha Plumbing)")
    print(f"  Sub B: {SUB_B_EMAIL} (company: Beta Electric)")


async def cleanup_test_data(conn):
    """Remove all test data."""
    # Delete in dependency order
    await conn.execute("DELETE FROM sub_task_documents WHERE task_id IN (SELECT id FROM sub_tasks WHERE project_id = $1)", PROJECT_ID)
    await conn.execute("DELETE FROM sub_checklist_items WHERE checklist_id IN (SELECT cl.id FROM sub_checklists cl JOIN sub_tasks st ON cl.task_id = st.id WHERE st.project_id = $1)", PROJECT_ID)
    await conn.execute("DELETE FROM sub_checklists WHERE task_id IN (SELECT id FROM sub_tasks WHERE project_id = $1)", PROJECT_ID)
    await conn.execute("DELETE FROM sub_task_reviews WHERE task_id IN (SELECT id FROM sub_tasks WHERE project_id = $1)", PROJECT_ID)
    await conn.execute("DELETE FROM sub_tasks WHERE project_id = $1", PROJECT_ID)
    await conn.execute("DELETE FROM sub_payment_milestones WHERE assignment_id IN (SELECT id FROM subcontractor_assignments WHERE project_id = $1)", PROJECT_ID)
    await conn.execute("DELETE FROM sub_performance_scores WHERE project_id = $1", PROJECT_ID)
    await conn.execute("DELETE FROM sub_checklist_templates WHERE company_id = $1", COMPANY_ID)
    await conn.execute("DELETE FROM client_portal.sub_invitations WHERE company_id = $1", COMPANY_ID)
    await conn.execute("DELETE FROM subcontractor_assignments WHERE project_id = $1", PROJECT_ID)
    await conn.execute("DELETE FROM users WHERE company_id = $1", COMPANY_ID)
    await conn.execute("DELETE FROM subcontractors WHERE company_id = $1", COMPANY_ID)
    await conn.execute("DELETE FROM projects WHERE id = $1", PROJECT_ID)
    await conn.execute("DELETE FROM companies WHERE id = $1", COMPANY_ID)
    print("  Test data cleaned up.")


async def run_tests():
    """Run all E2E tests."""
    from httpx import AsyncClient, ASGITransport
    from main import app

    transport = ASGITransport(app=app)

    url = os.getenv("DATABASE_URL_DEV", "")
    conn = await asyncpg.connect(url)

    print("\n" + "=" * 70)
    print("SUBCONTRACTOR MODULE E2E WORKFLOW TEST")
    print("=" * 70)

    # --- SETUP ---
    print("\n--- SETUP ---")
    await setup_test_data(conn)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ================================================================
        # TEST 1: PM Login
        # ================================================================
        print("\n--- TEST 1: PM Login ---")
        resp = await client.post("/api/v1/auth/login", json={
            "email": PM_EMAIL, "password": PM_PASSWORD
        })
        pm_logged_in = resp.status_code == 200
        log_result("PM login", pm_logged_in, f"status={resp.status_code}")
        pm_cookies = dict(resp.cookies)
        pm_session = pm_cookies.get("session_id", "")
        csrf_token = resp.headers.get("x-csrf-token", "")
        pm_headers = {"Cookie": f"session_id={pm_session}"}
        if csrf_token:
            pm_headers["X-CSRF-Token"] = csrf_token

        if not pm_logged_in:
            print("  CRITICAL: PM login failed, cannot continue tests")
            await cleanup_test_data(conn)
            await conn.close()
            return

        # ================================================================
        # TEST 2: PM can list sub companies
        # ================================================================
        print("\n--- TEST 2: List Sub Companies ---")
        resp = await client.get("/api/v1/sub/companies", headers=pm_headers)
        companies = resp.json() if resp.status_code == 200 else []
        found_a = any(c.get("name", "").startswith("Alpha Plumbing") for c in companies)
        found_b = any(c.get("name", "").startswith("Beta Electric") for c in companies)
        log_result("List sub companies", resp.status_code == 200, f"status={resp.status_code}, count={len(companies)}")
        log_result("Alpha Plumbing found", found_a)
        log_result("Beta Electric found", found_b)

        # ================================================================
        # TEST 3: PM can get sub company detail
        # ================================================================
        print("\n--- TEST 3: Get Sub Company Detail ---")
        resp = await client.get(f"/api/v1/sub/companies/{SUB_COMPANY_A_ID}", headers=pm_headers)
        log_result("Get sub company detail", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            log_result("Company name correct", data.get("name", "").startswith("Alpha Plumbing"))
            log_result("Trade correct", data.get("trade") == "Plumbing")

        # ================================================================
        # TEST 4: PM can create a sub company
        # ================================================================
        print("\n--- TEST 4: Create Sub Company ---")
        resp = await client.post("/api/v1/sub/companies", headers=pm_headers, json={
            "name": f"Gamma HVAC {TEST_ID}", "trade": "HVAC",
            "contactEmail": "gamma@test.com",
        })
        log_result("Create sub company", resp.status_code == 201, f"status={resp.status_code}")
        new_sub_company_id = resp.json().get("id") if resp.status_code == 201 else None

        # ================================================================
        # TEST 5: PM can update a sub company
        # ================================================================
        print("\n--- TEST 5: Update Sub Company ---")
        if new_sub_company_id:
            resp = await client.put(f"/api/v1/sub/companies/{new_sub_company_id}", headers=pm_headers, json={
                "notes": "Updated via E2E test",
            })
            log_result("Update sub company", resp.status_code == 200, f"status={resp.status_code}")
        else:
            log_result("Update sub company", False, "no company to update")

        # ================================================================
        # TEST 6: PM can soft-delete a sub company
        # ================================================================
        print("\n--- TEST 6: Delete (deactivate) Sub Company ---")
        if new_sub_company_id:
            resp = await client.delete(f"/api/v1/sub/companies/{new_sub_company_id}", headers=pm_headers)
            log_result("Deactivate sub company", resp.status_code == 200, f"status={resp.status_code}")
        else:
            log_result("Deactivate sub company", False, "no company to delete")

        # ================================================================
        # TEST 7: PM can invite a subcontractor
        # ================================================================
        print("\n--- TEST 7: Invite Subcontractor ---")
        invite_email = f"e2e_sub_{TEST_ID}_invited@test.com"
        resp = await client.post("/api/v1/sub/invite", headers=pm_headers, json={
            "firstName": "Invited", "lastName": "SubUser",
            "email": invite_email,
            "companyName": f"Invited Co {TEST_ID}",
            "trade": "Concrete",
            "projectId": PROJECT_ID,
            "welcomeNote": "Welcome to the project!",
        })
        log_result("Invite subcontractor", resp.status_code == 200, f"status={resp.status_code}")
        invite_data = resp.json() if resp.status_code == 200 else {}
        magic_link_url = invite_data.get("magicLinkUrl", "")
        invited_user_id = invite_data.get("userId", "")
        log_result("Magic link generated", bool(magic_link_url), f"url={'...'+magic_link_url[-20:] if magic_link_url else 'NONE'}")
        log_result("User ID returned", bool(invited_user_id))

        # ================================================================
        # TEST 8: Verify magic link (sub login)
        # ================================================================
        print("\n--- TEST 8: Verify Magic Link (Sub Login) ---")
        if magic_link_url:
            # Extract token from URL
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(magic_link_url)
            token = parse_qs(parsed.query).get("token", [""])[0]
            resp = await client.post("/api/v1/sub/verify-magic-link", json={"token": token})
            log_result("Verify magic link", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                verify_data = resp.json()
                log_result("Role is subcontractor", verify_data.get("role", "").lower() in ("subcontractor", "contractor"))
                log_result("Sub portal permission", verify_data.get("permissions", {}).get("subPortal") is True)
                log_result("Dashboard hidden", verify_data.get("permissions", {}).get("dashboard") is False)
        else:
            log_result("Verify magic link", False, "no magic link to verify")

        # ================================================================
        # TEST 9: Create checklist template
        # ================================================================
        print("\n--- TEST 9: Create Checklist Template ---")
        resp = await client.post("/api/v1/sub/templates", headers=pm_headers, json={
            "name": f"Plumbing Rough-In {TEST_ID}",
            "tradeCategory": "Plumbing",
            "items": [
                {"description": "Water supply lines stubbed out", "itemType": "standard"},
                {"description": "Drain lines sloped to spec", "itemType": "doc_required"},
                {"description": "Pressure test passed", "itemType": "inspection"},
            ],
        })
        log_result("Create template", resp.status_code == 201, f"status={resp.status_code}")
        template_id = resp.json().get("id") if resp.status_code == 201 else None
        if resp.status_code == 201:
            template_data = resp.json()
            items = template_data.get("items", [])
            if isinstance(items, str):
                import json as json_mod
                items = json_mod.loads(items)
            log_result("Template has 3 items", len(items) == 3, f"type={type(items).__name__}, count={len(items) if isinstance(items, list) else 'N/A'}")

        # ================================================================
        # TEST 10: List templates
        # ================================================================
        print("\n--- TEST 10: List Templates ---")
        resp = await client.get("/api/v1/sub/templates", headers=pm_headers)
        log_result("List templates", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            templates = resp.json()
            log_result("Template found in list", any(t.get("id") == template_id for t in templates))

        # ================================================================
        # TEST 11: Create sub task for Sub A
        # ================================================================
        print("\n--- TEST 11: Create Sub Task (for Sub A) ---")
        resp = await client.post("/api/v1/sub/tasks", headers=pm_headers, json={
            "projectId": PROJECT_ID,
            "assignedTo": SUB_COMPANY_A_ID,
            "assignedUserId": SUB_USER_A_ID,
            "name": f"Install kitchen rough-in plumbing {TEST_ID}",
            "description": "Complete rough-in plumbing for the kitchen area",
            "instructions": "Follow plans sheet P-101. Use PEX for supply lines.",
            "priority": "high",
            "locationTag": "Kitchen - Floor 1",
            "startDate": "2026-03-15T00:00:00Z",
            "endDate": "2026-03-20T00:00:00Z",
            "estimatedHours": 24,
        })
        log_result("Create sub task", resp.status_code == 201, f"status={resp.status_code}")
        task_a_id = resp.json().get("id") if resp.status_code == 201 else None

        # ================================================================
        # TEST 12: Create sub task for Sub B
        # ================================================================
        print("\n--- TEST 12: Create Sub Task (for Sub B) ---")
        resp = await client.post("/api/v1/sub/tasks", headers=pm_headers, json={
            "projectId": PROJECT_ID,
            "assignedTo": SUB_COMPANY_B_ID,
            "assignedUserId": SUB_USER_B_ID,
            "name": f"Wire kitchen circuits {TEST_ID}",
            "description": "Install electrical circuits for kitchen",
            "priority": "medium",
        })
        log_result("Create sub task for Sub B", resp.status_code == 201, f"status={resp.status_code}")
        task_b_id = resp.json().get("id") if resp.status_code == 201 else None

        # ================================================================
        # TEST 13: Create checklist on task A
        # ================================================================
        print("\n--- TEST 13: Create Checklist on Task A ---")
        if task_a_id:
            resp = await client.post(f"/api/v1/sub/tasks/{task_a_id}/checklists", headers=pm_headers, json={
                "name": "Rough-In Verification",
                "items": [
                    {"description": "Supply lines installed", "itemType": "standard"},
                    {"description": "Photo of drain slopes", "itemType": "doc_required"},
                    {"description": "Pressure test result", "itemType": "doc_required"},
                ],
            })
            log_result("Create checklist", resp.status_code == 201, f"status={resp.status_code}")
            checklist_data = resp.json() if resp.status_code == 201 else {}
            checklist_items = checklist_data.get("items", [])
            log_result("Checklist has 3 items", len(checklist_items) == 3)
            standard_item_id = next((i["id"] for i in checklist_items if i.get("itemType") == "standard"), None)
            doc_item_id = next((i["id"] for i in checklist_items if i.get("itemType") == "doc_required"), None)
            doc_item_id2 = None
            for i in checklist_items:
                if i.get("itemType") == "doc_required" and i["id"] != doc_item_id:
                    doc_item_id2 = i["id"]
                    break
        else:
            log_result("Create checklist", False, "no task to add checklist to")
            standard_item_id = doc_item_id = doc_item_id2 = None

        # ================================================================
        # TEST 14: Apply template to task B
        # ================================================================
        print("\n--- TEST 14: Apply Template to Task B ---")
        if template_id and task_b_id:
            resp = await client.post(f"/api/v1/sub/templates/{template_id}/apply/{task_b_id}", headers=pm_headers)
            log_result("Apply template", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                applied_data = resp.json()
                log_result("Template items applied", len(applied_data.get("items", [])) == 3)
        else:
            log_result("Apply template", False, "missing template or task")

        # ================================================================
        # TEST 15: PM lists all sub tasks
        # ================================================================
        print("\n--- TEST 15: PM Lists All Sub Tasks ---")
        resp = await client.get(f"/api/v1/sub/tasks?projectId={PROJECT_ID}", headers=pm_headers)
        log_result("PM list tasks", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            all_tasks = resp.json()
            log_result("PM sees both tasks", len(all_tasks) >= 2, f"count={len(all_tasks)}")

        # ================================================================
        # TEST 16: Login as Sub A
        # ================================================================
        print("\n--- TEST 16: Login as Sub A (via session) ---")
        # Create session for Sub A directly
        from src.api.auth import create_session, get_navigation_permissions
        from src.middleware.security import generate_csrf_token, store_csrf_token
        sub_a_perms = get_navigation_permissions("subcontractor", False)
        sub_a_session_data = {
            "id": SUB_USER_A_ID, "userId": SUB_USER_A_ID,
            "email": SUB_A_EMAIL, "first_name": "Alice", "last_name": "SubA",
            "role": "subcontractor", "role_name": "subcontractor",
            "companyId": COMPANY_ID, "company_id": COMPANY_ID,
            "isRoot": False, "is_root": False, "isActive": True, "is_active": True,
            "subcontractorId": SUB_COMPANY_A_ID,
            "permissions": sub_a_perms,
        }
        sub_a_session_id = await create_session(SUB_USER_A_ID, sub_a_session_data)
        sub_a_csrf = generate_csrf_token()
        store_csrf_token(sub_a_session_id, sub_a_csrf)
        sub_a_headers = {"Cookie": f"session_id={sub_a_session_id}", "X-CSRF-Token": sub_a_csrf}
        log_result("Sub A session created", bool(sub_a_session_id))

        # ================================================================
        # TEST 17: Sub A views their tasks (my-tasks)
        # ================================================================
        print("\n--- TEST 17: Sub A Views My Tasks ---")
        resp = await client.get(f"/api/v1/sub/my-tasks?projectId={PROJECT_ID}", headers=sub_a_headers)
        log_result("Sub A my-tasks", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            sub_a_tasks = resp.json()
            log_result("Sub A sees only their task", len(sub_a_tasks) == 1, f"count={len(sub_a_tasks)}")
            if sub_a_tasks:
                log_result("Task is the kitchen plumbing", "kitchen" in sub_a_tasks[0].get("name", "").lower())

        # ================================================================
        # TEST 18: Sub A views task detail
        # ================================================================
        print("\n--- TEST 18: Sub A Views Task Detail ---")
        if task_a_id:
            resp = await client.get(f"/api/v1/sub/tasks/{task_a_id}", headers=sub_a_headers)
            log_result("Sub A view task detail", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                detail = resp.json()
                log_result("Task has checklists", len(detail.get("checklists", [])) > 0)
                log_result("Task has reviews array", "reviews" in detail)
        else:
            log_result("Sub A view task detail", False, "no task_a_id")

        # ================================================================
        # TEST 19: Sub A CANNOT see Sub B's task (SECURITY)
        # ================================================================
        print("\n--- TEST 19: Sub A CANNOT See Sub B's Task (Security) ---")
        if task_b_id:
            resp = await client.get(f"/api/v1/sub/tasks/{task_b_id}", headers=sub_a_headers)
            log_result("Sub A blocked from Sub B's task", resp.status_code == 403, f"status={resp.status_code}")
        else:
            log_result("Sub A blocked from Sub B's task", False, "no task_b_id")

        # ================================================================
        # TEST 20: Sub A marks task as in_progress
        # ================================================================
        print("\n--- TEST 20: Sub A Starts Task (in_progress) ---")
        if task_a_id:
            resp = await client.put(f"/api/v1/sub/tasks/{task_a_id}/status", headers=sub_a_headers, json={
                "status": "in_progress",
            })
            log_result("Start task", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Status is in_progress", resp.json().get("status") == "in_progress")

        # ================================================================
        # TEST 21: Sub A completes standard checklist item
        # ================================================================
        print("\n--- TEST 21: Complete Standard Checklist Item ---")
        if standard_item_id:
            resp = await client.put(f"/api/v1/sub/checklist-items/{standard_item_id}/complete", headers=sub_a_headers, json={
                "notes": "Supply lines installed with 3/4 PEX",
            })
            log_result("Complete standard item", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Item marked completed", resp.json().get("isCompleted") is True)
                log_result("Notes saved", "PEX" in (resp.json().get("notes") or ""))

        # ================================================================
        # TEST 22: Sub A tries to complete doc_required item WITHOUT doc (should fail)
        # ================================================================
        print("\n--- TEST 22: Complete Doc-Required Item Without Doc (Should Fail) ---")
        if doc_item_id:
            resp = await client.put(f"/api/v1/sub/checklist-items/{doc_item_id}/complete", headers=sub_a_headers, json={})
            log_result("Doc-required without doc rejected", resp.status_code == 400, f"status={resp.status_code}")

        # ================================================================
        # TEST 23: Sub A uploads document to doc_required item
        # ================================================================
        print("\n--- TEST 23: Upload Document ---")
        if doc_item_id:
            resp = await client.post(f"/api/v1/sub/checklist-items/{doc_item_id}/documents", headers=sub_a_headers, json={
                "filePath": "projects/test/drain-slope-photo.jpg",
                "fileName": "drain-slope-photo.jpg",
                "mimeType": "image/jpeg",
                "fileSize": 245000,
            })
            log_result("Upload document", resp.status_code == 201, f"status={resp.status_code}")
            if resp.status_code == 201:
                doc_data = resp.json()
                log_result("File path stored", doc_data.get("filePath") == "projects/test/drain-slope-photo.jpg")
                uploaded_doc_id = doc_data.get("id")

        # ================================================================
        # TEST 24: List documents for item
        # ================================================================
        print("\n--- TEST 24: List Documents for Item ---")
        if doc_item_id:
            resp = await client.get(f"/api/v1/sub/checklist-items/{doc_item_id}/documents", headers=sub_a_headers)
            log_result("List documents", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Document found", len(resp.json()) >= 1)

        # ================================================================
        # TEST 25: Complete doc_required item WITH doc
        # ================================================================
        print("\n--- TEST 25: Complete Doc-Required Item With Doc ---")
        if doc_item_id:
            resp = await client.put(f"/api/v1/sub/checklist-items/{doc_item_id}/complete", headers=sub_a_headers, json={
                "notes": "Drain slopes verified at 1/4 inch per foot",
            })
            log_result("Complete doc-required item with doc", resp.status_code == 200, f"status={resp.status_code}")

        # Upload doc for second doc_required item and complete it
        if doc_item_id2:
            await client.post(f"/api/v1/sub/checklist-items/{doc_item_id2}/documents", headers=sub_a_headers, json={
                "filePath": "projects/test/pressure-test.pdf",
                "fileName": "pressure-test.pdf",
                "mimeType": "application/pdf",
                "fileSize": 128000,
            })
            await client.put(f"/api/v1/sub/checklist-items/{doc_item_id2}/complete", headers=sub_a_headers, json={
                "notes": "Pressure test passed at 80 PSI",
            })

        # ================================================================
        # TEST 26: Sub A uncompletes an item
        # ================================================================
        print("\n--- TEST 26: Uncomplete Checklist Item ---")
        if standard_item_id:
            resp = await client.put(f"/api/v1/sub/checklist-items/{standard_item_id}/uncomplete", headers=sub_a_headers)
            log_result("Uncomplete item", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Item unmarked", resp.json().get("isCompleted") is False)
            # Re-complete it
            await client.put(f"/api/v1/sub/checklist-items/{standard_item_id}/complete", headers=sub_a_headers, json={})

        # ================================================================
        # TEST 27: Sub A submits task for review
        # ================================================================
        print("\n--- TEST 27: Submit Task for Review ---")
        if task_a_id:
            resp = await client.put(f"/api/v1/sub/tasks/{task_a_id}/status", headers=sub_a_headers, json={
                "status": "pending_review",
            })
            log_result("Submit for review", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Status is pending_review", resp.json().get("status") == "pending_review")

        # ================================================================
        # TEST 28: Sub A CANNOT create a task (RBAC)
        # ================================================================
        print("\n--- TEST 28: Sub A CANNOT Create Tasks (RBAC) ---")
        resp = await client.post("/api/v1/sub/tasks", headers=sub_a_headers, json={
            "projectId": PROJECT_ID, "name": "Hacker task",
        })
        log_result("Sub blocked from creating tasks", resp.status_code == 403, f"status={resp.status_code}")

        # ================================================================
        # TEST 29: Sub A CANNOT access review queue (RBAC)
        # ================================================================
        print("\n--- TEST 29: Sub A CANNOT Access Review Queue (RBAC) ---")
        resp = await client.get("/api/v1/sub/reviews/queue", headers=sub_a_headers)
        log_result("Sub blocked from review queue", resp.status_code == 403, f"status={resp.status_code}")

        # ================================================================
        # TEST 30: Sub A CANNOT access templates (RBAC)
        # ================================================================
        print("\n--- TEST 30: Sub A CANNOT Access Templates (RBAC) ---")
        resp = await client.get("/api/v1/sub/templates", headers=sub_a_headers)
        log_result("Sub blocked from templates", resp.status_code == 403, f"status={resp.status_code}")

        # ================================================================
        # TEST 31: PM views review queue
        # ================================================================
        print("\n--- TEST 31: PM Views Review Queue ---")
        resp = await client.get(f"/api/v1/sub/reviews/queue?projectId={PROJECT_ID}", headers=pm_headers)
        log_result("PM review queue", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            queue = resp.json()
            log_result("Task A in queue", any(t.get("id") == task_a_id for t in queue), f"count={len(queue)}")

        # ================================================================
        # TEST 32: PM rejects task (revision_requested)
        # ================================================================
        print("\n--- TEST 32: PM Rejects Task (Revision Requested) ---")
        if task_a_id:
            resp = await client.post(f"/api/v1/sub/tasks/{task_a_id}/review", headers=pm_headers, json={
                "decision": "revision_requested",
                "feedback": "Drain slope photo is blurry, please retake",
                "rejectionReason": "Poor documentation",
            })
            log_result("PM revision request", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 33: Sub A sees revision_requested status
        # ================================================================
        print("\n--- TEST 33: Sub A Sees Revision Requested ---")
        if task_a_id:
            resp = await client.get(f"/api/v1/sub/tasks/{task_a_id}", headers=sub_a_headers)
            log_result("Task shows revision_requested", resp.status_code == 200 and resp.json().get("status") == "revision_requested")
            if resp.status_code == 200:
                reviews = resp.json().get("reviews", [])
                log_result("Review history has entry", len(reviews) >= 1)
                if reviews:
                    log_result("Review has feedback", "blurry" in (reviews[0].get("feedback") or "").lower())

        # ================================================================
        # TEST 34: Sub A resubmits
        # ================================================================
        print("\n--- TEST 34: Sub A Resubmits After Revision ---")
        if task_a_id:
            # First transition back to in_progress
            resp = await client.put(f"/api/v1/sub/tasks/{task_a_id}/status", headers=sub_a_headers, json={
                "status": "in_progress",
            })
            log_result("Back to in_progress", resp.status_code == 200)
            # Then resubmit
            resp = await client.put(f"/api/v1/sub/tasks/{task_a_id}/status", headers=sub_a_headers, json={
                "status": "pending_review",
            })
            log_result("Resubmit for review", resp.status_code == 200)

        # ================================================================
        # TEST 35: PM approves task
        # ================================================================
        print("\n--- TEST 35: PM Approves Task ---")
        if task_a_id:
            resp = await client.post(f"/api/v1/sub/tasks/{task_a_id}/review", headers=pm_headers, json={
                "decision": "approved",
                "feedback": "Looks good, approved!",
            })
            log_result("PM approves task", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 36: Verify task is now approved
        # ================================================================
        print("\n--- TEST 36: Verify Task Approved ---")
        if task_a_id:
            resp = await client.get(f"/api/v1/sub/tasks/{task_a_id}", headers=sub_a_headers)
            if resp.status_code == 200:
                log_result("Task status is approved", resp.json().get("status") == "approved")
                reviews = resp.json().get("reviews", [])
                log_result("Two reviews in history", len(reviews) == 2, f"count={len(reviews)}")

        # ================================================================
        # TEST 37: PM gets review history
        # ================================================================
        print("\n--- TEST 37: Get Review History ---")
        if task_a_id:
            resp = await client.get(f"/api/v1/sub/tasks/{task_a_id}/reviews", headers=pm_headers)
            log_result("Get review history", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Has 2 reviews", len(resp.json()) == 2)

        # ================================================================
        # TEST 38: Get assignment ID for milestones
        # ================================================================
        print("\n--- TEST 38: Create Payment Milestone (with linked tasks) ---")
        assignment_row = await conn.fetchrow(
            "SELECT id FROM subcontractor_assignments WHERE subcontractor_id = $1 AND project_id = $2",
            SUB_USER_A_ID, PROJECT_ID,
        )
        assignment_id = str(assignment_row["id"]) if assignment_row else None
        if assignment_id and task_a_id:
            resp = await client.post(f"/api/v1/sub/assignments/{assignment_id}/milestones", headers=pm_headers, json={
                "name": f"Rough-In Complete {TEST_ID}",
                "description": "Payment for rough-in plumbing completion",
                "amount": 15000,
                "retentionPct": 10,
                "milestoneType": "fixed",
                "linkedTaskIds": [task_a_id],
            })
            log_result("Create milestone with linked tasks", resp.status_code == 201, f"status={resp.status_code}")
            milestone_linked_id = resp.json().get("id") if resp.status_code == 201 else None
        else:
            log_result("Create milestone with linked tasks", False, "missing assignment or task")
            milestone_linked_id = None

        # ================================================================
        # TEST 39: Verify milestone auto-payable
        # ================================================================
        print("\n--- TEST 39: Verify Milestone Auto-Payable ---")
        if milestone_linked_id:
            # The task was approved in test 35, so the milestone should have been auto-marked payable
            resp = await client.get(f"/api/v1/sub/assignments/{assignment_id}/milestones", headers=pm_headers)
            if resp.status_code == 200:
                milestones = resp.json()
                linked_m = next((m for m in milestones if m.get("id") == milestone_linked_id), None)
                log_result("Milestone is payable", linked_m and linked_m.get("status") == "payable",
                           f"status={linked_m.get('status') if linked_m else 'NOT FOUND'}")
            else:
                log_result("Milestone is payable", False, f"list failed: {resp.status_code}")
        else:
            log_result("Milestone is payable", False, "no milestone")

        # ================================================================
        # TEST 40: Create milestone WITHOUT linked tasks (manual)
        # ================================================================
        print("\n--- TEST 40: Create Milestone Without Linked Tasks ---")
        if assignment_id:
            resp = await client.post(f"/api/v1/sub/assignments/{assignment_id}/milestones", headers=pm_headers, json={
                "name": f"Mobilization Fee {TEST_ID}",
                "amount": 5000,
                "milestoneType": "fixed",
            })
            log_result("Create unlinked milestone", resp.status_code == 201, f"status={resp.status_code}")
            milestone_unlinked_id = resp.json().get("id") if resp.status_code == 201 else None
            if resp.status_code == 201:
                log_result("Unlinked milestone is pending", resp.json().get("status") == "pending")

        # ================================================================
        # TEST 41: PM manually marks unlinked milestone as payable
        # ================================================================
        print("\n--- TEST 41: PM Manually Marks Milestone Payable ---")
        if milestone_unlinked_id:
            resp = await client.put(f"/api/v1/sub/milestones/{milestone_unlinked_id}", headers=pm_headers, json={
                "status": "payable",
            })
            log_result("Manual payable", resp.status_code == 200 and resp.json().get("status") == "payable")

        # ================================================================
        # TEST 42: Admin marks milestone as paid
        # ================================================================
        print("\n--- TEST 42: Mark Milestone as Paid ---")
        # PM login has admin-level access via the pm_role (need admin for mark-paid)
        # Let's create an admin session
        admin_role = await conn.fetchrow("SELECT id FROM roles WHERE LOWER(COALESCE(role_name, name)) = 'admin'")
        admin_role_id = admin_role["id"]
        admin_id = str(uuid.uuid4())
        admin_email = f"e2e_sub_{TEST_ID}_admin@test.com"
        admin_pw = bcrypt.hashpw(b"AdminPass123!", bcrypt.gensalt()).decode()
        await conn.execute(
            """INSERT INTO users (id, email, username, first_name, last_name, password,
               role_id, company_id, is_active, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())""",
            admin_id, admin_email, admin_email, "Admin", "Tester", admin_pw, admin_role_id, COMPANY_ID,
        )

        resp = await client.post("/api/v1/auth/login", json={
            "email": admin_email, "password": "AdminPass123!",
        })
        admin_cookies = dict(resp.cookies)
        admin_session = admin_cookies.get("session_id", "")
        admin_csrf = resp.headers.get("x-csrf-token", "")
        admin_headers = {"Cookie": f"session_id={admin_session}"}
        if admin_csrf:
            admin_headers["X-CSRF-Token"] = admin_csrf

        if milestone_unlinked_id and resp.status_code == 200:
            resp = await client.put(f"/api/v1/sub/milestones/{milestone_unlinked_id}/mark-paid", headers=admin_headers, json={
                "paidAmount": 5000,
            })
            log_result("Admin marks paid", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Milestone status is paid", resp.json().get("status") == "paid")
                log_result("Paid amount correct", resp.json().get("paidAmount") == 5000)
        else:
            log_result("Admin marks paid", False, "admin login or milestone issue")

        # ================================================================
        # TEST 43: Sub A views their milestones
        # ================================================================
        print("\n--- TEST 43: Sub A Views My Milestones ---")
        resp = await client.get("/api/v1/sub/my-milestones", headers=sub_a_headers)
        log_result("Sub A my-milestones", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            my_milestones = resp.json()
            log_result("Sub A sees milestones", len(my_milestones) >= 2, f"count={len(my_milestones)}")

        # ================================================================
        # TEST 44: Calculate performance scores
        # ================================================================
        print("\n--- TEST 44: Calculate Performance Scores ---")
        resp = await client.post(f"/api/v1/sub/companies/{SUB_COMPANY_A_ID}/calculate-performance", headers=pm_headers)
        log_result("Calculate performance", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            perf_data = resp.json()
            scores = perf_data.get("scores", [])
            log_result("Performance scores calculated", len(scores) > 0, f"count={len(scores)}")
            if scores:
                log_result("Composite score > 0", scores[0].get("composite", 0) > 0, f"composite={scores[0].get('composite')}")

        # ================================================================
        # TEST 45: Sub A views their performance
        # ================================================================
        print("\n--- TEST 45: Sub A Views Performance ---")
        resp = await client.get(f"/api/v1/sub/companies/{SUB_COMPANY_A_ID}/performance", headers=sub_a_headers)
        log_result("Sub A view performance", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 46: Sub A CANNOT view Sub B's performance (security)
        # ================================================================
        print("\n--- TEST 46: Sub A CANNOT View Sub B Performance ---")
        resp = await client.get(f"/api/v1/sub/companies/{SUB_COMPANY_B_ID}/performance", headers=sub_a_headers)
        log_result("Sub A blocked from Sub B performance", resp.status_code == 403, f"status={resp.status_code}")

        # ================================================================
        # TEST 47: PM views performance dashboard
        # ================================================================
        print("\n--- TEST 47: PM Views Performance Dashboard ---")
        resp = await client.get("/api/v1/sub/performance/dashboard", headers=pm_headers)
        log_result("PM performance dashboard", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            dashboard = resp.json()
            log_result("Dashboard has entries", len(dashboard) > 0, f"count={len(dashboard)}")

        # ================================================================
        # TEST 48: Sub A views their projects
        # ================================================================
        print("\n--- TEST 48: Sub A Views My Projects ---")
        resp = await client.get("/api/v1/sub/my-projects", headers=sub_a_headers)
        log_result("Sub A my-projects", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            projects = resp.json()
            log_result("Sub A sees their project", len(projects) >= 1, f"count={len(projects)}")

        # ================================================================
        # TEST 49: PM update task
        # ================================================================
        print("\n--- TEST 49: PM Updates Task ---")
        if task_b_id:
            resp = await client.put(f"/api/v1/sub/tasks/{task_b_id}", headers=pm_headers, json={
                "priority": "critical",
                "locationTag": "Kitchen - Floor 2",
            })
            log_result("PM update task", resp.status_code == 200, f"status={resp.status_code}")
            if resp.status_code == 200:
                log_result("Priority updated", resp.json().get("priority") == "critical")

        # ================================================================
        # TEST 50: PM deletes document
        # ================================================================
        print("\n--- TEST 50: PM Deletes Document ---")
        if doc_item_id:
            docs_resp = await client.get(f"/api/v1/sub/checklist-items/{doc_item_id}/documents", headers=pm_headers)
            if docs_resp.status_code == 200:
                docs = docs_resp.json()
                if docs:
                    resp = await client.delete(f"/api/v1/sub/documents/{docs[0]['id']}", headers=pm_headers)
                    log_result("PM delete document", resp.status_code == 200, f"status={resp.status_code}")
                else:
                    log_result("PM delete document", False, "no docs to delete")
            else:
                log_result("PM delete document", False, f"list failed: {docs_resp.status_code}")

        # ================================================================
        # TEST 51: Update template
        # ================================================================
        print("\n--- TEST 51: Update Template ---")
        if template_id:
            resp = await client.put(f"/api/v1/sub/templates/{template_id}", headers=pm_headers, json={
                "name": f"Updated Plumbing Template {TEST_ID}",
                "items": [
                    {"description": "Item 1 updated", "itemType": "standard"},
                    {"description": "Item 2 updated", "itemType": "doc_required"},
                ],
            })
            log_result("Update template", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 52: Delete template
        # ================================================================
        print("\n--- TEST 52: Delete Template ---")
        if template_id:
            resp = await client.delete(f"/api/v1/sub/templates/{template_id}", headers=pm_headers)
            log_result("Delete template", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 53: PM deletes task
        # ================================================================
        print("\n--- TEST 53: PM Deletes Task ---")
        if task_b_id:
            resp = await client.delete(f"/api/v1/sub/tasks/{task_b_id}", headers=pm_headers)
            log_result("PM delete task", resp.status_code == 200, f"status={resp.status_code}")

        # ================================================================
        # TEST 54: Invalid status transitions
        # ================================================================
        print("\n--- TEST 54: Invalid Status Transition ---")
        if task_a_id:
            # Task A is approved; sub cannot transition it back
            resp = await client.put(f"/api/v1/sub/tasks/{task_a_id}/status", headers=sub_a_headers, json={
                "status": "in_progress",
            })
            log_result("Invalid transition blocked", resp.status_code == 400, f"status={resp.status_code}")

        # ================================================================
        # TEST 55: Sub A CANNOT access PM company list
        # ================================================================
        print("\n--- TEST 55: Sub A CANNOT List Companies (RBAC) ---")
        resp = await client.get("/api/v1/sub/companies", headers=sub_a_headers)
        log_result("Sub blocked from company list", resp.status_code == 403, f"status={resp.status_code}")

    # --- CLEANUP ---
    print("\n--- CLEANUP ---")
    # Delete assignments for invited/admin users before deleting users
    await conn.execute(
        "DELETE FROM subcontractor_assignments WHERE subcontractor_id IN (SELECT id FROM users WHERE email IN ($1, $2))",
        invite_email, admin_email,
    )
    await conn.execute("DELETE FROM users WHERE email = $1", invite_email)
    await conn.execute("DELETE FROM users WHERE email = $1", admin_email)
    # Clean up invited sub company
    await conn.execute("DELETE FROM subcontractors WHERE company_id = $1 AND id NOT IN ($2, $3)",
                       COMPANY_ID, SUB_COMPANY_A_ID, SUB_COMPANY_B_ID)
    await cleanup_test_data(conn)
    await conn.close()

    # --- SUMMARY ---
    print("\n" + "=" * 70)
    print(f"RESULTS: {PASS_COUNT} passed, {FAIL_COUNT} failed, {PASS_COUNT + FAIL_COUNT} total")
    print("=" * 70)
    if FAIL_COUNT > 0:
        print("\nFailed tests:")
        for name, passed, detail in RESULTS:
            if not passed:
                print(f"  FAIL: {name} -- {detail}")
    print()


if __name__ == "__main__":
    asyncio.run(run_tests())
