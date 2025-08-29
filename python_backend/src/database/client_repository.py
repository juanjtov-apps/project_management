from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List

from src.models import (
    ForumMessage,
    Installment,
    Issue,
    IssueCreate,
    MaterialItem,
    NotificationSetting,
)


class ClientModuleRepository:
    """In-memory repository for client related operations.

    The existing application relies on a database, however for this module we
    provide an in-memory implementation so the rest of the system can interact
    with well defined async methods without requiring additional infrastructure.
    """

    def __init__(self) -> None:
        self.issues: Dict[str, Issue] = {}
        self.forum_messages: List[ForumMessage] = []
        self.materials: Dict[str, MaterialItem] = {}
        self.installments: Dict[str, Installment] = {}
        self.notification_settings: Dict[str, NotificationSetting] = {}

    async def create_issue(self, issue: IssueCreate) -> Issue:
        issue_id = str(uuid.uuid4())
        new_issue = Issue(
            id=issue_id,
            project_id=issue.project_id,
            title=issue.title,
            description=issue.description,
            photos=issue.photos,
            created_by=issue.created_by,
            status="open",
            created_at=datetime.utcnow(),
        )
        self.issues[issue_id] = new_issue
        return new_issue

    async def list_issues(self, project_id: str) -> List[Issue]:
        return [i for i in self.issues.values() if i.project_id == project_id]

    async def close_issue(self, issue_id: str) -> Issue | None:
        issue = self.issues.get(issue_id)
        if issue:
            issue.status = "closed"  # type: ignore[assignment]
        return issue

    async def add_forum_message(
        self, project_id: str, author_id: str, content: str
    ) -> ForumMessage:
        message = ForumMessage(
            id=str(uuid.uuid4()),
            project_id=project_id,
            author_id=author_id,
            content=content,
            created_at=datetime.utcnow(),
        )
        self.forum_messages.append(message)
        return message

    async def list_forum_messages(self, project_id: str) -> List[ForumMessage]:
        return [m for m in self.forum_messages if m.project_id == project_id]

    async def add_material(self, item: MaterialItem) -> MaterialItem:
        self.materials[item.id] = item
        return item

    async def remove_material(self, material_id: str) -> None:
        self.materials.pop(material_id, None)

    async def list_materials(self, project_id: str) -> List[MaterialItem]:
        return [m for m in self.materials.values() if m.project_id == project_id]

    async def add_installment(self, installment: Installment) -> Installment:
        self.installments[installment.id] = installment
        return installment

    async def mark_installment_paid(
        self, installment_id: str, payment_method: str
    ) -> Installment | None:
        inst = self.installments.get(installment_id)
        if inst:
            inst.is_paid = True  # type: ignore[assignment]
            inst.payment_method = payment_method
        return inst

    async def list_installments(self, project_id: str) -> List[Installment]:
        return [i for i in self.installments.values() if i.project_id == project_id]

    async def set_notification(self, setting: NotificationSetting) -> NotificationSetting:
        self.notification_settings[setting.id] = setting
        return setting

    async def list_notifications(self, project_id: str) -> List[NotificationSetting]:
        return [n for n in self.notification_settings.values() if n.project_id == project_id]

