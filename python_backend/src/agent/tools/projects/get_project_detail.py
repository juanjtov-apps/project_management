"""
Get Project Detail tool - Retrieves comprehensive project state.
"""

from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.repositories import ProjectRepository
from src.database.connection import db_manager


class GetProjectDetailTool(BaseTool):
    """Retrieve comprehensive project state including stages, tasks, materials, and KPIs."""

    @property
    def name(self) -> str:
        return "get_project_detail"

    @property
    def description(self) -> str:
        return (
            "Retrieve comprehensive project state including stages, tasks, materials, "
            "issues, timeline, team members, and key metrics. Use this when you need "
            "detailed information about a specific project."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to get details for",
                },
                "project_name": {
                    "type": "string",
                    "description": "Project name to search for (if project_id not provided)",
                },
                "include_tasks": {
                    "type": "boolean",
                    "description": "Include task/punch list details",
                    "default": True,
                },
                "include_stages": {
                    "type": "boolean",
                    "description": "Include stage information",
                    "default": True,
                },
                "include_materials": {
                    "type": "boolean",
                    "description": "Include materials list",
                    "default": False,
                },
            },
            "required": [],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def _find_project_by_name(
        self, name: str, company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Find a project by name within the company."""
        project_repo = ProjectRepository()
        projects = await project_repo.get_by_company(company_id)

        name_lower = name.lower()
        for p in projects:
            if name_lower in (p.get("name") or "").lower():
                return p

        return None

    async def _get_project_stages(self, project_id: str) -> List[Dict[str, Any]]:
        """Get stages for a project."""
        query = """
            SELECT * FROM client_portal.project_stages
            WHERE project_id = $1
            ORDER BY order_index ASC
        """
        rows = await db_manager.execute_query(query, project_id)
        return [dict(row) for row in rows]

    async def _get_project_materials(self, project_id: str) -> List[Dict[str, Any]]:
        """Get materials for a project."""
        query = """
            SELECT mi.*, ma.name as area_name
            FROM client_portal.material_items mi
            LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
            WHERE mi.project_id = $1
            ORDER BY ma.sort_order, mi.created_at
        """
        rows = await db_manager.execute_query(query, project_id)
        return [dict(row) for row in rows]

    async def _get_project_issues(self, project_id: str) -> List[Dict[str, Any]]:
        """Get open issues for a project."""
        query = """
            SELECT * FROM client_portal.issues
            WHERE project_id = $1 AND status != 'closed'
            ORDER BY created_at DESC
            LIMIT 10
        """
        rows = await db_manager.execute_query(query, project_id)
        return [dict(row) for row in rows]

    def _to_dict(self, project) -> Dict[str, Any]:
        """Convert project object or dict to a normalized dict."""
        if isinstance(project, dict):
            return project
        # Convert Project object to dict
        return {
            "id": getattr(project, "id", None),
            "name": getattr(project, "name", None),
            "description": getattr(project, "description", None),
            "location": getattr(project, "location", None),
            "status": getattr(project, "status", None),
            "progress": getattr(project, "progress", None),
            "dueDate": getattr(project, "dueDate", None),
            "budget": getattr(project, "budget", None),
            "actualCost": getattr(project, "actualCost", None),
            "clientName": getattr(project, "clientName", None),
            "clientEmail": getattr(project, "clientEmail", None),
            "companyId": getattr(project, "companyId", None),
        }

    async def _get_tasks_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """Get tasks for a project."""
        query = """
            SELECT * FROM tasks
            WHERE project_id = $1
            ORDER BY created_at DESC
        """
        rows = await db_manager.execute_query(query, project_id)
        return [dict(row) for row in rows]

    def _serialize_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert datetime and Decimal values to JSON-serializable types."""
        result = {}
        for key, value in item.items():
            if isinstance(value, (date, datetime)):
                result[key] = value.isoformat()
            elif isinstance(value, Decimal):
                result[key] = float(value)
            elif hasattr(value, 'hex'):  # UUID
                result[key] = str(value)
            else:
                result[key] = value
        return result

    def _serialize_list(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Serialize a list of items."""
        return [self._serialize_item(item) for item in items]

    def _calculate_days_until(self, target_date) -> Optional[int]:
        """Calculate days until target date. Positive = future, negative = overdue."""
        if not target_date:
            return None
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        if isinstance(target_date, str):
            try:
                target_date = datetime.fromisoformat(target_date.replace("Z", "+00:00")).date()
            except ValueError:
                return None
        today = date.today()
        return (target_date - today).days

    async def _get_active_stage_summary(self, project_id: str) -> Dict[str, Any]:
        """Get current stage with rich context including dates and days until end."""
        stages = await self._get_project_stages(project_id)
        if not stages:
            return {"hasStages": False}

        active_stage = next((s for s in stages if s.get("status") == "ACTIVE"), None)
        total_stages = len(stages)

        if not active_stage:
            # Check if all completed or none started
            completed = sum(1 for s in stages if s.get("status") == "COMPLETE")
            return {
                "hasStages": True,
                "totalStages": total_stages,
                "completedStages": completed,
                "activeStage": None,
                "allCompleted": completed == total_stages,
            }

        planned_end = active_stage.get("planned_end_date")
        materials_due = active_stage.get("finish_materials_due_date")

        return {
            "hasStages": True,
            "totalStages": total_stages,
            "completedStages": sum(1 for s in stages if s.get("status") == "COMPLETE"),
            "activeStage": {
                "id": str(active_stage.get("id")),
                "name": active_stage.get("name"),
                "status": active_stage.get("status"),
                "orderIndex": active_stage.get("order_index"),
                "plannedStartDate": str(active_stage.get("planned_start_date")) if active_stage.get("planned_start_date") else None,
                "plannedEndDate": str(planned_end) if planned_end else None,
                "materialsDeliveryDue": str(materials_due) if materials_due else None,
                "daysUntilEnd": self._calculate_days_until(planned_end),
                "daysUntilMaterialsDue": self._calculate_days_until(materials_due),
            },
        }

    async def _get_payment_summary(self, project_id: str) -> Dict[str, Any]:
        """Get payment installments summary with overdue tracking."""
        query = """
            SELECT id, name, description, amount, currency, due_date, status
            FROM client_portal.payment_installments
            WHERE project_id = $1
            ORDER BY due_date ASC
        """
        rows = await db_manager.execute_query(query, project_id)
        installments = [dict(row) for row in rows]

        if not installments:
            return {"hasPayments": False}

        today = date.today()
        total_amount = 0.0
        paid_amount = 0.0
        pending_amount = 0.0
        overdue_amount = 0.0
        paid_count = 0
        pending_count = 0
        overdue_count = 0
        next_installment = None
        overdue_installments = []

        for inst in installments:
            amount = float(inst.get("amount") or 0)
            total_amount += amount
            status = (inst.get("status") or "").lower()
            due_date = inst.get("due_date")

            if status == "paid":
                paid_amount += amount
                paid_count += 1
            else:
                # Check if overdue
                is_overdue = False
                if due_date:
                    if isinstance(due_date, datetime):
                        due_date = due_date.date()
                    is_overdue = due_date < today

                if is_overdue:
                    overdue_amount += amount
                    overdue_count += 1
                    days_overdue = (today - due_date).days
                    overdue_installments.append({
                        "id": str(inst.get("id")),
                        "name": inst.get("name"),
                        "amount": amount,
                        "currency": inst.get("currency") or "USD",
                        "dueDate": str(due_date),
                        "daysOverdue": days_overdue,
                        "status": status,
                    })
                else:
                    pending_amount += amount
                    pending_count += 1
                    # Track next installment (first non-paid, non-overdue)
                    if not next_installment and due_date:
                        days_until = (due_date - today).days
                        next_installment = {
                            "id": str(inst.get("id")),
                            "name": inst.get("name"),
                            "amount": amount,
                            "currency": inst.get("currency") or "USD",
                            "dueDate": str(due_date),
                            "daysUntilDue": days_until,
                            "status": status,
                        }

        return {
            "hasPayments": True,
            "totalInstallments": len(installments),
            "paidCount": paid_count,
            "pendingCount": pending_count,
            "overdueCount": overdue_count,
            "totalAmount": round(total_amount, 2),
            "paidAmount": round(paid_amount, 2),
            "pendingAmount": round(pending_amount, 2),
            "overdueAmount": round(overdue_amount, 2),
            "nextInstallment": next_installment,
            "overdueInstallments": overdue_installments[:5],  # Limit to 5
        }

    async def _get_issues_summary(self, project_id: str) -> Dict[str, Any]:
        """Get issues summary with priority breakdown and overdue tracking."""
        query = """
            SELECT id, title, description, status, priority, due_date, assigned_to, created_at
            FROM client_portal.issues
            WHERE project_id = $1 AND status != 'closed'
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                due_date ASC NULLS LAST
        """
        rows = await db_manager.execute_query(query, project_id)
        issues = [dict(row) for row in rows]

        if not issues:
            return {"hasIssues": False, "totalOpen": 0}

        today = date.today()
        priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        overdue_count = 0
        critical_items = []
        overdue_items = []

        for issue in issues:
            priority = (issue.get("priority") or "medium").lower()
            if priority in priority_counts:
                priority_counts[priority] += 1

            due_date = issue.get("due_date")
            days_until = self._calculate_days_until(due_date)

            # Track critical/high priority items
            if priority in ("critical", "high") and len(critical_items) < 5:
                critical_items.append({
                    "id": str(issue.get("id")),
                    "title": issue.get("title"),
                    "priority": priority,
                    "status": issue.get("status"),
                    "dueDate": str(due_date) if due_date else None,
                    "daysUntilDue": days_until,
                    "assignedTo": str(issue.get("assigned_to")) if issue.get("assigned_to") else None,
                })

            # Track overdue items
            if days_until is not None and days_until < 0:
                overdue_count += 1
                if len(overdue_items) < 5:
                    overdue_items.append({
                        "id": str(issue.get("id")),
                        "title": issue.get("title"),
                        "priority": priority,
                        "dueDate": str(due_date),
                        "daysOverdue": abs(days_until),
                    })

        return {
            "hasIssues": True,
            "totalOpen": len(issues),
            "criticalCount": priority_counts["critical"],
            "highCount": priority_counts["high"],
            "mediumCount": priority_counts["medium"],
            "lowCount": priority_counts["low"],
            "overdueCount": overdue_count,
            "criticalItems": critical_items,
            "overdueItems": overdue_items,
        }

    async def _get_materials_summary(self, project_id: str) -> Dict[str, Any]:
        """Get materials summary grouped by stage in chronological order with overdue tracking."""
        query = """
            SELECT
                mi.id, mi.name, mi.status, mi.spec,
                ma.name as area_name,
                mi.stage_id,
                ps.name as stage_name,
                ps.finish_materials_due_date,
                ps.order_index as stage_order
            FROM client_portal.material_items mi
            LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
            LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
            WHERE mi.project_id = $1
            ORDER BY ps.finish_materials_due_date ASC NULLS LAST, ps.order_index ASC NULLS LAST, mi.created_at DESC
        """
        rows = await db_manager.execute_query(query, project_id)
        materials = [dict(row) for row in rows]

        if not materials:
            return {"hasMaterials": False, "totalItems": 0}

        today = date.today()

        # Status counts
        status_counts = {
            "pending": 0,
            "approved": 0,
            "ordered": 0,
            "delivered": 0,
            "installed": 0,
        }

        # Group materials by stage
        stages_dict: Dict[str, Dict[str, Any]] = {}
        overdue_items = []
        total_overdue = 0

        for material in materials:
            # Count by status
            status = (material.get("status") or "pending").lower()
            if status in status_counts:
                status_counts[status] += 1

            # Group by stage
            stage_id = str(material.get("stage_id")) if material.get("stage_id") else None
            stage_name = material.get("stage_name") or "Unassigned"
            due_date = material.get("finish_materials_due_date")

            if stage_id not in stages_dict:
                days_until = self._calculate_days_until(due_date) if due_date else None
                is_overdue = days_until is not None and days_until < 0
                stages_dict[stage_id] = {
                    "stageId": stage_id,
                    "stageName": stage_name,
                    "finishMaterialsDue": str(due_date) if due_date else None,
                    "daysUntilDue": days_until,
                    "isOverdue": is_overdue,
                    "stageOrder": material.get("stage_order"),
                    "items": [],
                }

            # Add material to stage
            stage_info = stages_dict[stage_id]
            material_entry = {
                "id": str(material.get("id")),
                "name": material.get("name"),
                "status": status,
                "areaName": material.get("area_name"),
            }

            # If stage is overdue and material not delivered/installed, mark as overdue
            # Only mark overdue if we have a valid due date (daysUntilDue is not None)
            if (stage_info["isOverdue"]
                and stage_info["daysUntilDue"] is not None
                and status not in ("delivered", "installed")):
                material_entry["daysOverdue"] = abs(stage_info["daysUntilDue"])
                total_overdue += 1
                if len(overdue_items) < 10:
                    overdue_items.append({
                        "id": str(material.get("id")),
                        "name": material.get("name"),
                        "status": status,
                        "stageName": stage_name,
                        "finishMaterialsDue": str(due_date) if due_date else None,
                        "daysOverdue": abs(stage_info["daysUntilDue"]),
                    })

            stage_info["items"].append(material_entry)

        # Convert to sorted list (already ordered by query, but ensure consistency)
        by_stage = list(stages_dict.values())
        # Sort: stages with due dates first (by date), then unassigned last
        by_stage.sort(key=lambda s: (
            s["finishMaterialsDue"] is None,  # None values last
            s["finishMaterialsDue"] or "",
            s["stageOrder"] or 999
        ))

        return {
            "hasMaterials": True,
            "totalItems": len(materials),
            "overdueCount": total_overdue,
            "pendingApproval": status_counts["pending"],
            "approved": status_counts["approved"],
            "ordered": status_counts["ordered"],
            "delivered": status_counts["delivered"],
            "installed": status_counts["installed"],
            "byStage": by_stage,
            "overdueItems": overdue_items,
        }

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_project_detail tool."""
        project_repo = ProjectRepository()
        company_id = context.get("company_id")

        project_id = params.get("project_id")
        project_name = params.get("project_name")

        # Find project
        project_data = None
        if project_id:
            project_obj = await project_repo.get_by_id(project_id)
            if project_obj:
                project_data = self._to_dict(project_obj)
                # Verify company access
                if company_id and project_data.get("companyId") != company_id:
                    return {
                        "error": "Access denied to this project",
                        "projectId": project_id,
                    }
        elif project_name:
            project_data = await self._find_project_by_name(project_name, company_id)

        if not project_data:
            return {
                "error": "Project not found",
                "projectId": project_id,
                "projectName": project_name,
            }

        # Get project ID for subsequent queries
        proj_id = project_data.get("id")

        # Build response
        result = {
            "project": {
                "id": project_data.get("id"),
                "name": project_data.get("name"),
                "description": project_data.get("description"),
                "location": project_data.get("location"),
                "status": project_data.get("status"),
                "progress": project_data.get("progress"),
                "dueDate": str(project_data.get("dueDate")) if project_data.get("dueDate") else None,
                "budget": project_data.get("budget"),
                "actualCost": project_data.get("actualCost"),
                "clientName": project_data.get("clientName"),
                "clientEmail": project_data.get("clientEmail"),
            },
        }

        # Include tasks if requested
        include_tasks = params.get("include_tasks", True)
        if include_tasks:
            tasks = await self._get_tasks_by_project(proj_id)
            result["tasks"] = {
                "items": self._serialize_list(tasks[:20]),  # Limit to 20 most recent
                "totalCount": len(tasks),
                "completedCount": sum(
                    1 for t in tasks if t.get("status") == "completed"
                ),
                "blockedCount": sum(
                    1 for t in tasks if t.get("status") == "blocked"
                ),
            }

        # Include stages if requested
        include_stages = params.get("include_stages", True)
        if include_stages:
            stages = await self._get_project_stages(proj_id)
            serialized_stages = self._serialize_list(stages)
            result["stages"] = {
                "items": serialized_stages,
                "totalCount": len(stages),
                "activeStage": next(
                    (s for s in serialized_stages if s.get("status") == "ACTIVE"), None
                ),
            }

        # Always include current stage summary with rich context
        result["currentStage"] = await self._get_active_stage_summary(proj_id)

        # Always include payment summary
        result["payments"] = await self._get_payment_summary(proj_id)

        # Always include issues summary with priority breakdown
        result["issues"] = await self._get_issues_summary(proj_id)

        # Include materials summary (always, but can be expanded with include_materials)
        result["materials"] = await self._get_materials_summary(proj_id)

        # Include full materials list if requested
        include_materials = params.get("include_materials", False)
        if include_materials:
            materials = await self._get_project_materials(proj_id)
            result["materials"]["items"] = self._serialize_list(materials[:30])

        # Keep legacy openIssues for backward compatibility
        issues = await self._get_project_issues(proj_id)
        result["openIssues"] = {
            "items": self._serialize_list(issues),
            "count": len(issues),
        }

        return result
