"""
AI insight generation service.
Pre-computes a one-liner insight per project using Claude via OpenRouter.
"""

import logging
from datetime import date, datetime
from typing import Optional

from src.database.connection import db_manager

logger = logging.getLogger(__name__)


async def seed_missing_insights() -> int:
    """Generate heuristic insights for active projects that have none.
    Called at startup — uses heuristic only to avoid hammering LLM.
    """
    try:
        rows = await db_manager.execute_query(
            "SELECT id FROM projects WHERE status != 'completed' AND ai_insight_text IS NULL"
        )
        count = 0
        for row in rows:
            result = await regenerate_project_insight(str(row["id"]), heuristic_only=True)
            if result:
                count += 1
        logger.info("Seeded insights for %d projects", count)
        return count
    except Exception as e:
        logger.exception("Failed to seed missing insights: %s", e)
        return 0


def _heuristic_insight(
    name: str,
    progress: int,
    overdue: int,
    due_this_week: int,
    open_issues: int,
    active_stage: Optional[str],
    status: str,
    language: str = "en",
) -> str:
    """Generate a fallback insight without LLM."""
    is_es = language == "es"
    if overdue > 0:
        if is_es:
            return f"{overdue} tarea{'s' if overdue != 1 else ''} vencida{'s' if overdue != 1 else ''} — revisa las prioridades antes de que se acumulen."
        return f"{overdue} overdue task{'s' if overdue != 1 else ''} — review priorities before they cascade."
    if status == "delayed":
        if is_es:
            return f"Proyecto retrasado. Enfócate en desbloquear {active_stage or 'la etapa actual'}."
        return f"Project is delayed. Focus on unblocking {active_stage or 'the current stage'}."
    if progress >= 80:
        if is_es:
            return f"{progress}% completado — comienza a programar inspecciones y lista de pendientes."
        return f"{progress}% complete — start lining up inspections and punch-list items."
    if due_this_week > 0:
        if is_es:
            return f"{due_this_week} tarea{'s' if due_this_week != 1 else ''} vence{'n' if due_this_week != 1 else ''} esta semana en {active_stage or 'etapa activa'}."
        return f"{due_this_week} task{'s' if due_this_week != 1 else ''} due this week in {active_stage or 'active stage'}."
    if open_issues > 0:
        if is_es:
            return f"{open_issues} incidencia{'s' if open_issues != 1 else ''} abierta{'s' if open_issues != 1 else ''} necesita{'n' if open_issues != 1 else ''} resolución."
        return f"{open_issues} open issue{'s' if open_issues != 1 else ''} need resolution before moving forward."
    if active_stage:
        if is_es:
            return f"En buen camino — {active_stage} está en progreso."
        return f"On track — {active_stage} is in progress."
    if is_es:
        return "En buen camino — sin bloqueos detectados."
    return "On track — no blockers detected."


async def regenerate_project_insight(project_id: str, heuristic_only: bool = False, language: str = "en") -> str:
    """Regenerate AI insight for a project, storing result in DB.

    If heuristic_only=True, skips LLM call (used for batch seeding at startup).
    """
    try:
        # Gather context in parallel-ish queries
        project = await db_manager.execute_one(
            "SELECT name, status, progress, due_date FROM projects WHERE id = $1",
            project_id,
        )
        if not project:
            return ""

        name = project["name"]
        status = project["status"]
        progress = project["progress"] or 0
        due_date = project.get("due_date")

        # Stage stats
        stage_row = await db_manager.execute_one(
            """
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE status = 'COMPLETE') as completed
            FROM client_portal.project_stages WHERE project_id = $1
            """,
            project_id,
        )
        total_stages = stage_row["total"] if stage_row else 0
        completed_stages = stage_row["completed"] if stage_row else 0

        active_stage_row = await db_manager.execute_one(
            """
            SELECT name FROM client_portal.project_stages
            WHERE project_id = $1 AND status = 'ACTIVE'
            ORDER BY order_index LIMIT 1
            """,
            project_id,
        )
        active_stage_name = active_stage_row["name"] if active_stage_row else None

        # Task stats
        today = date.today()
        task_row = await db_manager.execute_one(
            """
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE status = 'completed') as completed,
                   COUNT(*) FILTER (WHERE due_date::date < $2::date AND status NOT IN ('completed','blocked')) as overdue,
                   COUNT(*) FILTER (WHERE due_date::date BETWEEN $2::date AND ($2::date + interval '7 days') AND status != 'completed') as due_this_week
            FROM tasks WHERE project_id = $1
            """,
            project_id,
            today,
        )
        total_tasks = task_row["total"] if task_row else 0
        completed_tasks = task_row["completed"] if task_row else 0
        overdue_tasks = task_row["overdue"] if task_row else 0
        due_this_week = task_row["due_this_week"] if task_row else 0

        # Open issues
        open_issues = 0
        try:
            issue_row = await db_manager.execute_one(
                "SELECT COUNT(*) as count FROM client_portal.issues WHERE project_id = $1 AND status != 'closed'",
                project_id,
            )
            open_issues = issue_row["count"] if issue_row else 0
        except Exception:
            pass

        # Always compute heuristic first (guaranteed to succeed)
        insight = _heuristic_insight(
            name, progress, overdue_tasks, due_this_week, open_issues, active_stage_name, status, language
        )

        # Try LLM upgrade (optional, may fail)
        if not heuristic_only:
            llm_insight = await _generate_llm_insight(
                name=name,
                status=status,
                progress=progress,
                due_date=due_date,
                active_stage_name=active_stage_name,
                completed_tasks=completed_tasks,
                total_tasks=total_tasks,
                overdue_tasks=overdue_tasks,
                due_this_week=due_this_week,
                open_issues=open_issues,
                language=language,
            )
            if llm_insight:
                insight = llm_insight

        # Store in DB
        await db_manager.execute(
            "UPDATE projects SET ai_insight_text = $1, ai_insight_updated_at = NOW() WHERE id = $2",
            insight,
            project_id,
        )

        logger.info("Insight regenerated for project %s: %s", project_id, insight[:60])
        return insight

    except Exception as e:
        logger.exception("Failed to regenerate insight for project %s: %s", project_id, e)
        return ""


async def _generate_llm_insight(
    name: str,
    status: str,
    progress: int,
    due_date,
    active_stage_name: Optional[str],
    completed_tasks: int,
    total_tasks: int,
    overdue_tasks: int,
    due_this_week: int,
    open_issues: int,
    language: str = "en",
) -> Optional[str]:
    """Call Claude via OpenRouter for a one-liner insight. Returns None on failure."""
    try:
        from src.agent.llm.openrouter_provider import OpenRouterProvider

        provider = OpenRouterProvider()

        due_str = due_date.strftime("%Y-%m-%d") if isinstance(due_date, (date, datetime)) else str(due_date or "N/A")

        language_instruction = ""
        if language == "es":
            language_instruction = "You MUST respond in Spanish (Español). "

        prompt = (
            f"{language_instruction}"
            "You are Proe, a construction project AI. Given this project data, write ONE sentence (max 120 chars) "
            "that tells a general contractor the single most important thing about this project right now.\n\n"
            "Rules:\n"
            "- On-track projects: next-step nudge (what to do this week)\n"
            "- At-risk projects: risk flag (what could slip)\n"
            "- Delayed projects: urgency escalation (what needs action today)\n"
            "- Nearly done (>80%): close-out status\n\n"
            f"Project: {name}, Status: {status}, Progress: {progress}%, Due: {due_str}\n"
            f"Active stage: {active_stage_name or 'N/A'}\n"
            f"Tasks: {completed_tasks}/{total_tasks} done, {overdue_tasks} overdue, {due_this_week} due this week\n"
            f"Open issues: {open_issues}"
        )

        result = await provider.chat_completion_sync(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=100,
        )

        content = result.get("content", "").strip().strip('"').strip("'")
        if content and len(content) <= 200:
            return content[:120]
        return None

    except Exception as e:
        logger.warning("LLM insight generation failed: %s", e)
        return None
