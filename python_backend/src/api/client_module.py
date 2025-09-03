from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
import uuid

from src.database.client_repository import ClientModuleRepository
from src.database.repositories import ProjectRepository
from src.api.auth import get_current_user_dependency, is_root_admin
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
project_repo = ProjectRepository()

async def verify_project_access(project_id: str, current_user: Dict[str, Any]) -> None:
    """Verify user has access to the specified project (company scoping)."""
    if is_root_admin(current_user):
        return  # Root admin can access all projects
    
    # Get project to check company ownership
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    user_company_id = str(current_user.get('companyId', ''))
    project_company_id = str(project.get('companyId', ''))
    
    if project_company_id != user_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Project belongs to different company"
        )


@router.post("/projects/{project_id}/issues", response_model=Issue)
async def create_issue(
    project_id: str, 
    issue: IssueCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Issue:
    await verify_project_access(project_id, current_user)
    if project_id != issue.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID mismatch",
        )
    return await repo.create_issue(issue)


@router.get("/projects/{project_id}/issues", response_model=List[Issue])
async def list_issues(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> List[Issue]:
    await verify_project_access(project_id, current_user)
    return await repo.list_issues(project_id)


@router.patch("/issues/{issue_id}", response_model=Issue)
async def close_issue(
    issue_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Issue:
    # Note: For individual issue access, we'd need to check project ownership
    # For now, authenticated users can close any issue (could be enhanced)
    issue = await repo.close_issue(issue_id)
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return issue


@router.post("/projects/{project_id}/forum", response_model=ForumMessage)
async def add_forum_message(
    project_id: str, 
    author_id: str, 
    content: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> ForumMessage:
    await verify_project_access(project_id, current_user)
    return await repo.add_forum_message(project_id, author_id, content)


@router.get("/projects/{project_id}/forum", response_model=List[ForumMessage])
async def list_forum_messages(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> List[ForumMessage]:
    await verify_project_access(project_id, current_user)
    return await repo.list_forum_messages(project_id)


@router.post("/projects/{project_id}/materials", response_model=MaterialItem)
async def add_material(
    project_id: str, 
    name: str, 
    added_by: str,
    category: str = "general",
    link: str | None = None,
    specification: str | None = None,
    notes: str | None = None,
    quantity: str | None = None,
    unit_cost: float | None = None,
    total_cost: float | None = None,
    supplier: str | None = None,
    status: str = "pending",
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> MaterialItem:
    await verify_project_access(project_id, current_user)
    item = MaterialItem(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=name,
        category=category,
        link=link,
        specification=specification,
        notes=notes,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=total_cost,
        supplier=supplier,
        status=status,
        added_by=added_by,
        created_at=datetime.utcnow(),
    )
    return await repo.add_material(item)


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_material(
    material_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> None:
    # Note: For individual material access, we'd need to check project ownership
    # For now, authenticated users can remove any material (could be enhanced)
    await repo.remove_material(material_id)


@router.get("/projects/{project_id}/materials", response_model=List[MaterialItem])
async def list_materials(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> List[MaterialItem]:
    await verify_project_access(project_id, current_user)
    return await repo.list_materials(project_id)


@router.post("/projects/{project_id}/installments", response_model=Installment)
async def add_installment(
    project_id: str, 
    amount: float, 
    due_date: datetime,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Installment:
    await verify_project_access(project_id, current_user)
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
async def mark_installment_paid(
    installment_id: str, 
    payment_method: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Installment:
    # Note: For individual installment access, we'd need to check project ownership
    # For now, authenticated users can mark any installment paid (could be enhanced)
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
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> NotificationSetting:
    await verify_project_access(project_id, current_user)
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
