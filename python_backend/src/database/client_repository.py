from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from src.models import (
    ForumMessage,
    Installment,
    Issue,
    IssueCreate,
    MaterialItem,
    NotificationSetting,
)
from .connection import DatabaseManager


class ClientModuleRepository:
    """Database repository for client module operations."""

    def __init__(self) -> None:
        self.db = DatabaseManager()

    async def create_issue(self, issue: IssueCreate) -> Issue:
        query = """
            INSERT INTO client_issues (project_id, title, description, photos, created_by, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, project_id, title, description, photos, created_by, status, created_at
        """
        row = await self.db.execute_one(
            query, 
            issue.project_id, 
            issue.title, 
            issue.description, 
            issue.photos, 
            issue.created_by, 
            "open"
        )
        return Issue(
            id=row["id"],
            project_id=row["project_id"],
            title=row["title"],
            description=row["description"],
            photos=row["photos"] or [],
            created_by=row["created_by"],
            status=row["status"],
            created_at=row["created_at"],
        )

    async def list_issues(self, project_id: str) -> List[Issue]:
        query = """
            SELECT id, project_id, title, description, photos, created_by, status, created_at
            FROM client_issues 
            WHERE project_id = $1 
            ORDER BY created_at DESC
        """
        rows = await self.db.execute_query(query, project_id)
        return [
            Issue(
                id=row["id"],
                project_id=row["project_id"],
                title=row["title"],
                description=row["description"],
                photos=row["photos"] or [],
                created_by=row["created_by"],
                status=row["status"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def close_issue(self, issue_id: str) -> Issue | None:
        query = """
            UPDATE client_issues 
            SET status = 'closed'
            WHERE id = $1
            RETURNING id, project_id, title, description, photos, created_by, status, created_at
        """
        row = await self.db.execute_one(query, issue_id)
        if not row:
            return None
        return Issue(
            id=row["id"],
            project_id=row["project_id"],
            title=row["title"],
            description=row["description"],
            photos=row["photos"] or [],
            created_by=row["created_by"],
            status=row["status"],
            created_at=row["created_at"],
        )

    async def add_forum_message(
        self, project_id: str, author_id: str, content: str
    ) -> ForumMessage:
        query = """
            INSERT INTO client_forum_messages (project_id, author_id, content)
            VALUES ($1, $2, $3)
            RETURNING id, project_id, author_id, content, created_at
        """
        row = await self.db.execute_one(query, project_id, author_id, content)
        return ForumMessage(
            id=row["id"],
            project_id=row["project_id"],
            author_id=row["author_id"],
            content=row["content"],
            created_at=row["created_at"],
        )

    async def list_forum_messages(self, project_id: str) -> List[ForumMessage]:
        query = """
            SELECT id, project_id, author_id, content, created_at
            FROM client_forum_messages 
            WHERE project_id = $1 
            ORDER BY created_at ASC
        """
        rows = await self.db.execute_query(query, project_id)
        return [
            ForumMessage(
                id=row["id"],
                project_id=row["project_id"],
                author_id=row["author_id"],
                content=row["content"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def add_material(self, item: MaterialItem) -> MaterialItem:
        query = """
            INSERT INTO client_materials (
                project_id, name, category, link, specification, notes, 
                quantity, unit_cost, total_cost, supplier, status, added_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, project_id, name, category, link, specification, notes,
                     quantity, unit_cost, total_cost, supplier, status, added_by, created_at
        """
        row = await self.db.execute_one(
            query, 
            item.project_id, 
            item.name, 
            item.category,
            item.link, 
            item.specification,
            item.notes,
            item.quantity,
            item.unit_cost,
            item.total_cost,
            item.supplier,
            item.status,
            item.added_by
        )
        return MaterialItem(
            id=row["id"],
            project_id=row["project_id"],
            name=row["name"],
            category=row["category"],
            link=row["link"],
            specification=row["specification"],
            notes=row["notes"],
            quantity=row["quantity"],
            unit_cost=row["unit_cost"],
            total_cost=row["total_cost"],
            supplier=row["supplier"],
            status=row["status"],
            added_by=row["added_by"],
            created_at=row["created_at"],
        )

    async def remove_material(self, material_id: str) -> None:
        query = "DELETE FROM client_materials WHERE id = $1"
        await self.db.execute(query, material_id)

    async def list_materials(self, project_id: str) -> List[MaterialItem]:
        query = """
            SELECT id, project_id, name, category, link, specification, notes,
                   quantity, unit_cost, total_cost, supplier, status, added_by, created_at
            FROM client_materials 
            WHERE project_id = $1 
            ORDER BY category, name
        """
        rows = await self.db.execute_query(query, project_id)
        return [
            MaterialItem(
                id=row["id"],
                project_id=row["project_id"],
                name=row["name"],
                category=row["category"] or "general",
                link=row["link"],
                specification=row["specification"],
                notes=row["notes"],
                quantity=row["quantity"],
                unit_cost=row["unit_cost"],
                total_cost=row["total_cost"],
                supplier=row["supplier"],
                status=row["status"] or "pending",
                added_by=row["added_by"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def add_installment(self, installment: Installment) -> Installment:
        query = """
            INSERT INTO client_installments (project_id, amount, due_date, is_paid, payment_method)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_id, amount, due_date, is_paid, payment_method, created_at
        """
        # Convert amount to cents for storage
        amount_cents = int(installment.amount * 100)
        row = await self.db.execute_one(
            query, 
            installment.project_id, 
            amount_cents, 
            installment.due_date, 
            installment.is_paid, 
            installment.payment_method
        )
        return Installment(
            id=row["id"],
            project_id=row["project_id"],
            amount=row["amount"] / 100.0,  # Convert back from cents
            due_date=row["due_date"],
            is_paid=row["is_paid"],
            payment_method=row["payment_method"],
            created_at=row["created_at"],
        )

    async def mark_installment_paid(
        self, installment_id: str, payment_method: str
    ) -> Installment | None:
        query = """
            UPDATE client_installments 
            SET is_paid = true, payment_method = $2
            WHERE id = $1
            RETURNING id, project_id, amount, due_date, is_paid, payment_method, created_at
        """
        row = await self.db.execute_one(query, installment_id, payment_method)
        if not row:
            return None
        return Installment(
            id=row["id"],
            project_id=row["project_id"],
            amount=row["amount"] / 100.0,  # Convert back from cents
            due_date=row["due_date"],
            is_paid=row["is_paid"],
            payment_method=row["payment_method"],
            created_at=row["created_at"],
        )

    async def list_installments(self, project_id: str) -> List[Installment]:
        query = """
            SELECT id, project_id, amount, due_date, is_paid, payment_method, created_at
            FROM client_installments 
            WHERE project_id = $1 
            ORDER BY due_date ASC
        """
        rows = await self.db.execute_query(query, project_id)
        return [
            Installment(
                id=row["id"],
                project_id=row["project_id"],
                amount=row["amount"] / 100.0,  # Convert back from cents
                due_date=row["due_date"],
                is_paid=row["is_paid"],
                payment_method=row["payment_method"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def set_notification(self, setting: NotificationSetting) -> NotificationSetting:
        query = """
            INSERT INTO client_notification_settings 
            (project_id, material_id, group_name, frequency_value, frequency_unit, notify_via_email)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, project_id, material_id, group_name, frequency_value, frequency_unit, notify_via_email, created_at
        """
        row = await self.db.execute_one(
            query, 
            setting.project_id, 
            setting.material_id, 
            setting.group_name, 
            setting.frequency_value, 
            setting.frequency_unit, 
            setting.notify_via_email
        )
        return NotificationSetting(
            id=row["id"],
            project_id=row["project_id"],
            material_id=row["material_id"],
            group_name=row["group_name"],
            frequency_value=row["frequency_value"],
            frequency_unit=row["frequency_unit"],
            notify_via_email=row["notify_via_email"],
            created_at=row["created_at"],
        )

    async def list_notifications(self, project_id: str) -> List[NotificationSetting]:
        query = """
            SELECT id, project_id, material_id, group_name, frequency_value, frequency_unit, notify_via_email, created_at
            FROM client_notification_settings 
            WHERE project_id = $1 
            ORDER BY created_at DESC
        """
        rows = await self.db.execute_query(query, project_id)
        return [
            NotificationSetting(
                id=row["id"],
                project_id=row["project_id"],
                material_id=row["material_id"],
                group_name=row["group_name"],
                frequency_value=row["frequency_value"],
                frequency_unit=row["frequency_unit"],
                notify_via_email=row["notify_via_email"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

