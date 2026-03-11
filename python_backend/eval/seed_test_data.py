"""
Seed test data for eval suite integration tests.

Idempotent — safe to run multiple times. Checks existence before insert.

Creates:
- 6 eval users (admin, PM, office_manager, crew, sub, client) in company 2
- 3 projects (Via Tesoro, Cole Dr, Woodside Dr) with realistic construction data
- Tasks, stages, issues, installments, material areas/items per project

Usage:
    cd python_backend && .venv/bin/python eval/seed_test_data.py
"""

import asyncio
import os
import sys
import uuid
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database.connection import get_db_pool


def stable_uuid(name: str) -> uuid.UUID:
    """Generate a deterministic UUID from a name string (UUID5 with DNS namespace)."""
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"proesphere-eval.{name}")


# =============================================================================
# Constants — must match eval/conftest.py
# =============================================================================

EVAL_COMPANY_ID = "2"

USERS = [
    {
        "id": "test-eval-admin",
        "email": "evaladmin@proesphere.com",
        "first_name": "Eval",
        "last_name": "Admin",
        "role_name": "admin",
        "role_id": 1,
    },
    {
        "id": "test-eval-pm",
        "email": "evalpm@proesphere.com",
        "first_name": "Eval",
        "last_name": "PM",
        "role_name": "project_manager",
        "role_id": 2,
    },
    {
        "id": "test-eval-om",
        "email": "evalom@proesphere.com",
        "first_name": "Eval",
        "last_name": "OfficeManager",
        "role_name": "office_manager",
        "role_id": 3,
    },
    {
        "id": "test-eval-crew",
        "email": "evalcrew@proesphere.com",
        "first_name": "Eval",
        "last_name": "Crew",
        "role_name": "crew",
        "role_id": 4,
    },
    {
        "id": "test-eval-sub",
        "email": "evalsub@proesphere.com",
        "first_name": "Eval",
        "last_name": "Sub",
        "role_name": "subcontractor",
        "role_id": 5,
    },
    {
        "id": "test-eval-client",
        "email": "evalclient@proesphere.com",
        "first_name": "Eval",
        "last_name": "Client",
        "role_name": "client",
        "role_id": 6,
    },
]

# Dates relative to "today"
TODAY = date.today()

PROJECTS = [
    {
        "id": "eval-proj-via-tesoro",
        "name": "Via Tesoro",
        "description": "Kitchen and bathroom remodel at Via Tesoro residence",
        "location": "123 Via Tesoro, San Diego, CA",
        "status": "active",
        "progress": 50,
        "due_date": TODAY + timedelta(days=60),
        "client_name": "Maria Gonzalez",
        "client_email": "maria@example.com",
    },
    {
        "id": "eval-proj-cole-dr",
        "name": "Cole Dr",
        "description": "Full home remodel on Cole Drive",
        "location": "456 Cole Dr, Encinitas, CA",
        "status": "delayed",
        "progress": 40,
        "due_date": TODAY + timedelta(days=30),
        "client_name": "James Cole",
        "client_email": "james@example.com",
    },
    {
        "id": "eval-proj-woodside",
        "name": "Woodside Dr",
        "description": "ADU construction at Woodside Drive",
        "location": "789 Woodside Dr, Carlsbad, CA",
        "status": "active",
        "progress": 85,
        "due_date": TODAY + timedelta(days=14),
        "client_name": "Sarah Wood",
        "client_email": "sarah@example.com",
    },
]


async def row_exists(pool, query: str, *args) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return row is not None


async def execute(pool, query: str, *args):
    async with pool.acquire() as conn:
        await conn.execute(query, *args)


async def fetchval(pool, query: str, *args):
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)


async def seed():
    pool = await get_db_pool()

    # ---- Ensure company 2 exists ----
    if not await row_exists(pool, "SELECT 1 FROM companies WHERE id = $1", EVAL_COMPANY_ID):
        print(f"ERROR: Company {EVAL_COMPANY_ID} does not exist. Seed your main company first.")
        return

    # ---- Lookup role IDs from DB ----
    role_map = {}
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name FROM roles")
        for r in rows:
            role_map[r["name"]] = r["id"]
    print(f"  Roles found: {role_map}")

    # ---- Users ----
    for u in USERS:
        if await row_exists(pool, "SELECT 1 FROM users WHERE id = $1", u["id"]):
            print(f"  User {u['id']} exists, skipping")
            continue
        rid = role_map.get(u["role_name"], u["role_id"])
        await execute(
            pool,
            """INSERT INTO users (id, email, first_name, last_name, company_id, role_id, is_root, is_active, password)
               VALUES ($1, $2, $3, $4, $5, $6, false, true, 'nologin')""",
            u["id"], u["email"], u["first_name"], u["last_name"], EVAL_COMPANY_ID, rid,
        )
        print(f"  Created user {u['id']}")

    admin_id = "test-eval-admin"
    pm_id = "test-eval-pm"
    crew_id = "test-eval-crew"

    # ---- Projects ----
    for p in PROJECTS:
        if await row_exists(pool, "SELECT 1 FROM projects WHERE id = $1", p["id"]):
            print(f"  Project {p['name']} exists, skipping")
            continue
        await execute(
            pool,
            """INSERT INTO projects (id, company_id, name, description, location, status, progress,
                                      due_date, client_name, client_email)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            p["id"], EVAL_COMPANY_ID, p["name"], p["description"], p["location"],
            p["status"], p["progress"], p["due_date"], p["client_name"], p["client_email"],
        )
        print(f"  Created project {p['name']}")

    # ---- Tasks ----
    tasks_data = [
        # Via Tesoro tasks
        ("eval-task-1", "eval-proj-via-tesoro", "Electrical rough-in", "in-progress", "high",
         crew_id, TODAY - timedelta(days=3), None),
        ("eval-task-2", "eval-proj-via-tesoro", "Framing inspection", "pending", "high",
         pm_id, TODAY + timedelta(days=2), None),
        ("eval-task-3", "eval-proj-via-tesoro", "Drywall patching", "pending", "medium",
         crew_id, TODAY - timedelta(days=1), None),  # overdue
        ("eval-task-4", "eval-proj-via-tesoro", "Install flooring", "pending", "medium",
         None, TODAY + timedelta(days=7), None),
        ("eval-task-5", "eval-proj-via-tesoro", "Cabinet installation", "completed", "medium",
         crew_id, TODAY - timedelta(days=10), TODAY - timedelta(days=8)),
        ("eval-task-6", "eval-proj-via-tesoro", "Plumbing rough-in", "completed", "high",
         crew_id, TODAY - timedelta(days=15), TODAY - timedelta(days=14)),
        # Cole Dr tasks
        ("eval-task-7", "eval-proj-cole-dr", "Foundation repair", "in-progress", "critical",
         crew_id, TODAY - timedelta(days=5), None),  # overdue
        ("eval-task-8", "eval-proj-cole-dr", "Framing", "pending", "high",
         None, TODAY + timedelta(days=14), None),
        ("eval-task-9", "eval-proj-cole-dr", "Demolition cleanup", "completed", "medium",
         crew_id, TODAY - timedelta(days=20), TODAY - timedelta(days=18)),
        # Woodside Dr tasks
        ("eval-task-10", "eval-proj-woodside", "Final inspection", "pending", "high",
         pm_id, TODAY + timedelta(days=5), None),
        ("eval-task-11", "eval-proj-woodside", "Paint touch-up", "in-progress", "medium",
         crew_id, TODAY + timedelta(days=3), None),
        ("eval-task-12", "eval-proj-woodside", "Landscaping", "pending", "low",
         None, TODAY + timedelta(days=10), None),
    ]

    for t in tasks_data:
        tid, pid, title, status, priority, assignee, due, completed = t
        if await row_exists(pool, "SELECT 1 FROM tasks WHERE id = $1", tid):
            continue
        await execute(
            pool,
            """INSERT INTO tasks (id, company_id, project_id, title, status, priority, assignee_id,
                                   due_date, completed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            tid, EVAL_COMPANY_ID, pid, title, status, priority, assignee,
            due, completed,
        )
    print(f"  Seeded {len(tasks_data)} tasks")

    # ---- Stages ----
    stages_data = [
        # Via Tesoro
        (stable_uuid("stage-1"), "eval-proj-via-tesoro", 1, "Demolition", "COMPLETE", admin_id),
        (stable_uuid("stage-2"), "eval-proj-via-tesoro", 2, "Framing", "ACTIVE", admin_id),
        (stable_uuid("stage-3"), "eval-proj-via-tesoro", 3, "Plumbing", "NOT_STARTED", admin_id),
        (stable_uuid("stage-4"), "eval-proj-via-tesoro", 4, "Electrical", "NOT_STARTED", admin_id),
        (stable_uuid("stage-5"), "eval-proj-via-tesoro", 5, "Finishing", "NOT_STARTED", admin_id),
        # Cole Dr
        (stable_uuid("stage-6"), "eval-proj-cole-dr", 1, "Foundation", "ACTIVE", admin_id),
        (stable_uuid("stage-7"), "eval-proj-cole-dr", 2, "Framing", "NOT_STARTED", admin_id),
        (stable_uuid("stage-8"), "eval-proj-cole-dr", 3, "Plumbing", "NOT_STARTED", admin_id),
        # Woodside Dr
        (stable_uuid("stage-9"), "eval-proj-woodside", 1, "Foundation", "COMPLETE", admin_id),
        (stable_uuid("stage-10"), "eval-proj-woodside", 2, "Framing", "COMPLETE", admin_id),
        (stable_uuid("stage-11"), "eval-proj-woodside", 3, "Finishing", "ACTIVE", admin_id),
    ]

    for s in stages_data:
        sid, pid, order, name, status, created_by = s
        if await row_exists(pool, "SELECT 1 FROM client_portal.project_stages WHERE id = $1", sid):
            continue
        await execute(
            pool,
            """INSERT INTO client_portal.project_stages (id, project_id, order_index, name, status, created_by)
               VALUES ($1, $2, $3, $4, $5, $6)""",
            sid, pid, order, name, status, created_by,
        )
    print(f"  Seeded {len(stages_data)} stages")

    # ---- Issues ----
    issues_data = [
        # Cole Dr issues (project has 4 open issues for briefing tests)
        (stable_uuid("issue-1"), "eval-proj-cole-dr", "Foundation crack discovered", "Crack found in east wall foundation",
         "critical", "open", admin_id),
        (stable_uuid("issue-2"), "eval-proj-cole-dr", "Wiring problem in kitchen", "Old wiring doesn't meet code",
         "high", "open", pm_id),
        (stable_uuid("issue-3"), "eval-proj-cole-dr", "Permit delay", "City permit review taking longer than expected",
         "medium", "open", pm_id),
        (stable_uuid("issue-4"), "eval-proj-cole-dr", "Noise complaint from neighbor", "Neighbor filed complaint about work hours",
         "low", "open", admin_id),
        # Via Tesoro issue (resolved)
        (stable_uuid("issue-5"), "eval-proj-via-tesoro", "Water damage in subfloor", "Minor water damage found during demo",
         "medium", "resolved", admin_id),
    ]

    for i in issues_data:
        iid, pid, title, desc, priority, status, created_by = i
        if await row_exists(pool, "SELECT 1 FROM client_portal.issues WHERE id = $1", iid):
            continue
        await execute(
            pool,
            """INSERT INTO client_portal.issues (id, project_id, title, description, priority, status, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            iid, pid, title, desc, priority, status, created_by,
        )
    print(f"  Seeded {len(issues_data)} issues")

    # ---- Installments ----
    installments_data = [
        # Via Tesoro
        (stable_uuid("inst-1"), "eval-proj-via-tesoro", "Flooring deposit", TODAY + timedelta(days=7),
         5000, "scheduled"),
        (stable_uuid("inst-2"), "eval-proj-via-tesoro", "Electrical phase", TODAY + timedelta(days=20),
         15000, "scheduled"),
        (stable_uuid("inst-3"), "eval-proj-via-tesoro", "Demo payment", TODAY - timedelta(days=30),
         8000, "paid"),
        # Cole Dr
        (stable_uuid("inst-4"), "eval-proj-cole-dr", "Foundation deposit", TODAY - timedelta(days=10),
         12000, "overdue"),
        (stable_uuid("inst-5"), "eval-proj-cole-dr", "Framing payment", TODAY + timedelta(days=30),
         20000, "scheduled"),
        # Woodside Dr
        (stable_uuid("inst-6"), "eval-proj-woodside", "Final payment", TODAY + timedelta(days=14),
         25000, "scheduled"),
    ]

    for inst in installments_data:
        iid, pid, label, due, amount, status = inst
        if await row_exists(pool, "SELECT 1 FROM client_portal.installments WHERE id = $1", iid):
            continue
        await execute(
            pool,
            """INSERT INTO client_portal.installments (id, project_id, label, due_date, amount, status)
               VALUES ($1, $2, $3, $4, $5, $6)""",
            iid, pid, label, due, amount, status,
        )
    print(f"  Seeded {len(installments_data)} installments")

    # ---- Material Areas + Items ----
    areas_data = [
        (stable_uuid("area-1"), "eval-proj-via-tesoro", "Kitchen", admin_id),
        (stable_uuid("area-2"), "eval-proj-via-tesoro", "Bathroom", admin_id),
        (stable_uuid("area-3"), "eval-proj-cole-dr", "Main Floor", admin_id),
    ]

    for a in areas_data:
        aid, pid, name, created_by = a
        if await row_exists(pool, "SELECT 1 FROM client_portal.material_areas WHERE id = $1", aid):
            continue
        await execute(
            pool,
            """INSERT INTO client_portal.material_areas (id, project_id, name, created_by)
               VALUES ($1, $2, $3, $4)""",
            aid, pid, name, created_by,
        )
    print(f"  Seeded {len(areas_data)} material areas")

    items_data = [
        (stable_uuid("item-1"), stable_uuid("area-1"), "eval-proj-via-tesoro", "Porcelain tiles", "12x24 matte white",
         "TileMax", "200 sqft", 4.50, admin_id),
        (stable_uuid("item-2"), stable_uuid("area-1"), "eval-proj-via-tesoro", "Cabinet handles", "Brushed nickel",
         "Hardware Co", "24", 8.00, admin_id),
        (stable_uuid("item-3"), stable_uuid("area-2"), "eval-proj-via-tesoro", "Shower door", "Frameless glass 60in",
         "GlassCo", "1", 850.00, admin_id),
        (stable_uuid("item-4"), stable_uuid("area-3"), "eval-proj-cole-dr", "Hardwood flooring", "Oak engineered 5in",
         "FloorDepot", "500 sqft", 6.00, admin_id),
    ]

    for item in items_data:
        iid, area_id, pid, name, spec, vendor, qty, cost, added_by = item
        if await row_exists(pool, "SELECT 1 FROM client_portal.material_items WHERE id = $1", iid):
            continue
        await execute(
            pool,
            """INSERT INTO client_portal.material_items (id, area_id, project_id, name, spec, vendor, quantity, unit_cost, added_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            iid, area_id, pid, name, spec, vendor, qty, cost, added_by,
        )
    print(f"  Seeded {len(items_data)} material items")

    # ---- Daily Logs ----
    logs_data = [
        ("eval-log-1", "eval-proj-via-tesoro", admin_id, "Framing progress",
         "6 workers on site. Framing 80% complete. Weather clear."),
        ("eval-log-2", "eval-proj-cole-dr", pm_id, "Foundation issue",
         "Foundation crack identified on east wall. Engineer scheduled for tomorrow."),
    ]

    for log in logs_data:
        lid, pid, uid, title, content = log
        if await row_exists(pool, "SELECT 1 FROM project_logs WHERE id = $1", lid):
            continue
        await execute(
            pool,
            """INSERT INTO project_logs (id, project_id, user_id, title, content, type)
               VALUES ($1, $2, $3, $4, $5, 'general')""",
            lid, pid, uid, title, content,
        )
    print(f"  Seeded {len(logs_data)} daily logs")

    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
