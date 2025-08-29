from typing import List
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import uuid

from src.database.client_repository import ClientModuleRepository
from src.models import (
    ForumMessage,
    Installment,
    Issue,
    IssueCreate,
    MaterialItem,
    NotificationSetting,
    FrequencyUnit,
)


router = APIRouter()
repo = ClientModuleRepository()


@router.post("/projects/{project_id}/issues", response_model=Issue)
async def create_issue(project_id: str, issue: IssueCreate) -> Issue:
    if project_id != issue.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID mismatch",
        )
    return await repo.create_issue(issue)


@router.get("/projects/{project_id}/issues", response_model=List[Issue])
async def list_issues(project_id: str) -> List[Issue]:
    return await repo.list_issues(project_id)


@router.patch("/issues/{issue_id}", response_model=Issue)
async def close_issue(issue_id: str) -> Issue:
    issue = await repo.close_issue(issue_id)
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return issue


@router.post("/projects/{project_id}/forum", response_model=ForumMessage)
async def add_forum_message(
    project_id: str, author_id: str, content: str
) -> ForumMessage:
    return await repo.add_forum_message(project_id, author_id, content)


@router.get("/projects/{project_id}/forum", response_model=List[ForumMessage])
async def list_forum_messages(project_id: str) -> List[ForumMessage]:
    return await repo.list_forum_messages(project_id)


@router.post("/projects/{project_id}/materials", response_model=MaterialItem)
async def add_material(project_id: str, name: str, added_by: str, link: str | None = None,
                       specification: str | None = None) -> MaterialItem:
    item = MaterialItem(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=name,
        link=link,
        specification=specification,
        added_by=added_by,
        created_at=datetime.utcnow(),
    )
    return await repo.add_material(item)


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_material(material_id: str) -> None:
    await repo.remove_material(material_id)


@router.get("/projects/{project_id}/materials", response_model=List[MaterialItem])
async def list_materials(project_id: str) -> List[MaterialItem]:
    return await repo.list_materials(project_id)


@router.post("/projects/{project_id}/installments", response_model=Installment)
async def add_installment(project_id: str, amount: float, due_date: datetime) -> Installment:
    installment = Installment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        amount=amount,
        due_date=due_date,
        is_paid=False,
        payment_method=None,
        created_at=datetime.utcnow(),
    )
    return await repo.add_installment(installment)


@router.patch("/installments/{installment_id}", response_model=Installment)
async def mark_installment_paid(installment_id: str, payment_method: str) -> Installment:
    inst = await repo.mark_installment_paid(installment_id, payment_method)
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
    return inst


@router.post("/projects/{project_id}/notifications", response_model=NotificationSetting)
async def set_notification(
    project_id: str,
    frequency_value: int,
    frequency_unit: FrequencyUnit,
    material_id: str | None = None,
    group_name: str | None = None,
    notify_via_email: bool = True,
) -> NotificationSetting:
    setting = NotificationSetting(
        id=str(uuid.uuid4()),
        project_id=project_id,
        material_id=material_id,
        group_name=group_name,
        frequency_value=frequency_value,
        frequency_unit=frequency_unit,
        notify_via_email=notify_via_email,
        created_at=datetime.utcnow(),
    )
    return await repo.set_notification(setting)


@router.get("/projects/{project_id}/notifications", response_model=List[NotificationSetting])
async def list_notifications(project_id: str) -> List[NotificationSetting]:
    return await repo.list_notifications(project_id)
