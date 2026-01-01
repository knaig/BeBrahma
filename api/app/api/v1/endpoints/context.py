"""
BeBrahma v0.3 - Context Endpoints

FastAPI endpoints for business context management.

Traceability:
- FR-007: Context Maintenance
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import uuid

from app.db.session import get_db
from app.models import Objective, Task, Unknown, Signal, NBASession
from app.schemas.context import (
    BusinessContextResponse,
    ObjectiveResponse,
    TaskResponse,
    UnknownResponse,
    SignalResponse,
    ContextSummary,
    CreateObjectiveRequest,
    CreateTaskRequest,
    CreateUnknownRequest
)
from app.schemas.nba import SuccessResponse
from app.core.logging import logger


router = APIRouter()


# Temporary: Mock authentication
async def get_current_user_id() -> str:
    return "test_user_123"


@router.get("", response_model=SuccessResponse)
async def get_context(
    include_completed: bool = False,
    signals_days: int = 7,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get full business context.

    Returns objectives, tasks, unknowns, and recent signals.

    **Traceability:** FR-007 (Context Maintenance)
    """
    try:
        # Get objectives
        objectives_query = select(Objective).where(
            Objective.user_id == user_id,
            Objective.deleted_at.is_(None)
        )
        if not include_completed:
            objectives_query = objectives_query.where(Objective.status != 'completed')

        objectives_query = objectives_query.order_by(Objective.priority.desc())
        objectives_result = await db.execute(objectives_query)
        objectives = objectives_result.scalars().all()

        # Get tasks
        tasks_query = select(Task).where(
            Task.user_id == user_id,
            Task.deleted_at.is_(None)
        )
        if not include_completed:
            tasks_query = tasks_query.where(Task.status.in_(['pending', 'in_progress']))

        tasks_query = tasks_query.order_by(Task.priority.desc())
        tasks_result = await db.execute(tasks_query)
        tasks = tasks_result.scalars().all()

        # Get unknowns
        unknowns_query = select(Unknown).where(
            Unknown.user_id == user_id,
            Unknown.deleted_at.is_(None)
        )
        if not include_completed:
            unknowns_query = unknowns_query.where(Unknown.status == 'open')

        unknowns_query = unknowns_query.order_by(Unknown.importance.desc())
        unknowns_result = await db.execute(unknowns_query)
        unknowns = unknowns_result.scalars().all()

        # Get recent signals
        signals_cutoff = datetime.utcnow() - timedelta(days=signals_days)
        signals_query = select(Signal).where(
            Signal.user_id == user_id,
            Signal.created_at >= signals_cutoff
        ).order_by(Signal.created_at.desc())

        signals_result = await db.execute(signals_query)
        signals = signals_result.scalars().all()

        # Get last NBA session
        last_session_query = select(NBASession).where(
            NBASession.user_id == user_id
        ).order_by(NBASession.created_at.desc()).limit(1)

        last_session_result = await db.execute(last_session_query)
        last_session = last_session_result.scalar_one_or_none()

        # Format response
        response = BusinessContextResponse(
            objectives=[
                ObjectiveResponse(
                    id=str(obj.id),
                    title=obj.title,
                    description=obj.description,
                    objective_type=obj.objective_type,
                    status=obj.status,
                    priority=obj.priority,
                    confidence_level=obj.confidence_level,
                    task_count=sum(1 for t in tasks if t.objective_id == obj.id),
                    unknown_count=sum(1 for u in unknowns if u.objective_id == obj.id),
                    evidence_count=0,  # TODO: Add evidence counting
                    created_at=obj.created_at.isoformat()
                )
                for obj in objectives
            ],
            tasks=[
                TaskResponse(
                    id=str(task.id),
                    objective_id=str(task.objective_id),
                    title=task.title,
                    description=task.description,
                    task_type=task.task_type,
                    status=task.status,
                    priority=task.priority,
                    due_date=task.due_date.isoformat() if task.due_date else None,
                    estimated_duration_minutes=task.estimated_duration_minutes,
                    score_total=float(task.score_total) if task.score_total else None
                )
                for task in tasks
            ],
            unknowns=[
                UnknownResponse(
                    id=str(unknown.id),
                    objective_id=str(unknown.objective_id),
                    question=unknown.question,
                    category=unknown.category,
                    importance=unknown.importance,
                    status=unknown.status,
                    evidence_count=0  # TODO: Add evidence counting
                )
                for unknown in unknowns
            ],
            recent_signals=[
                SignalResponse(
                    id=str(signal.id),
                    signal_type=signal.signal_type,
                    content=signal.content,
                    intent_category=signal.intent_category,
                    sentiment=signal.sentiment,
                    created_at=signal.created_at.isoformat()
                )
                for signal in signals
            ],
            summary=ContextSummary(
                total_objectives=len(objectives),
                active_tasks=sum(1 for t in tasks if t.status in ['pending', 'in_progress']),
                open_unknowns=sum(1 for u in unknowns if u.status == 'open'),
                signals_last_7_days=len(signals),
                last_nba_session=last_session.created_at.isoformat() if last_session else None
            )
        )

        return SuccessResponse(
            success=True,
            data=response
        )

    except Exception as e:
        logger.error(f"Error getting context: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to get business context"
            }
        )


@router.post("/objectives", response_model=SuccessResponse, status_code=201)
async def create_objective(
    request: CreateObjectiveRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new objective.

    **Traceability:** FR-007 (Context Maintenance)
    """
    try:
        objective = Objective(
            id=uuid.uuid4(),
            user_id=user_id,
            title=request.title,
            description=request.description,
            objective_type=request.objective_type,
            status='active',
            priority=request.priority,
            target_completion_date=request.target_completion_date,
            started_at=datetime.utcnow()
        )

        db.add(objective)
        await db.commit()
        await db.refresh(objective)

        logger.info(f"Objective created: {objective.id}")

        return SuccessResponse(
            success=True,
            data={
                "objective": ObjectiveResponse(
                    id=str(objective.id),
                    title=objective.title,
                    description=objective.description,
                    objective_type=objective.objective_type,
                    status=objective.status,
                    priority=objective.priority,
                    confidence_level=objective.confidence_level,
                    task_count=0,
                    unknown_count=0,
                    evidence_count=0,
                    created_at=objective.created_at.isoformat()
                )
            }
        )

    except Exception as e:
        logger.error(f"Error creating objective: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create objective"
            }
        )


@router.post("/tasks", response_model=SuccessResponse, status_code=201)
async def create_task(
    request: CreateTaskRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new task.

    **Traceability:** FR-007 (Context Maintenance)
    """
    try:
        # Verify objective exists
        objective_query = select(Objective).where(
            Objective.id == request.objective_id,
            Objective.user_id == user_id
        )
        objective_result = await db.execute(objective_query)
        objective = objective_result.scalar_one_or_none()

        if not objective:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "OBJECTIVE_NOT_FOUND",
                    "message": f"Objective {request.objective_id} not found"
                }
            )

        task = Task(
            id=uuid.uuid4(),
            user_id=user_id,
            objective_id=uuid.UUID(request.objective_id),
            title=request.title,
            description=request.description,
            task_type=request.task_type,
            status='pending',
            priority=request.priority,
            due_date=request.due_date,
            estimated_duration_minutes=request.estimated_duration_minutes
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        logger.info(f"Task created: {task.id}")

        return SuccessResponse(
            success=True,
            data={
                "task": TaskResponse(
                    id=str(task.id),
                    objective_id=str(task.objective_id),
                    title=task.title,
                    description=task.description,
                    task_type=task.task_type,
                    status=task.status,
                    priority=task.priority,
                    due_date=task.due_date.isoformat() if task.due_date else None,
                    estimated_duration_minutes=task.estimated_duration_minutes,
                    score_total=None
                )
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error creating task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create task"
            }
        )


@router.post("/unknowns", response_model=SuccessResponse, status_code=201)
async def create_unknown(
    request: CreateUnknownRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new critical unknown.

    **Traceability:** FR-007 (Context Maintenance)
    """
    try:
        # Verify objective exists
        objective_query = select(Objective).where(
            Objective.id == request.objective_id,
            Objective.user_id == user_id
        )
        objective_result = await db.execute(objective_query)
        objective = objective_result.scalar_one_or_none()

        if not objective:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "OBJECTIVE_NOT_FOUND",
                    "message": f"Objective {request.objective_id} not found"
                }
            )

        unknown = Unknown(
            id=uuid.uuid4(),
            user_id=user_id,
            objective_id=uuid.UUID(request.objective_id),
            question=request.question,
            category=request.category,
            importance=request.importance,
            status='open',
            target_resolution_date=request.target_resolution_date
        )

        db.add(unknown)
        await db.commit()
        await db.refresh(unknown)

        logger.info(f"Unknown created: {unknown.id}")

        return SuccessResponse(
            success=True,
            data={
                "unknown": UnknownResponse(
                    id=str(unknown.id),
                    objective_id=str(unknown.objective_id),
                    question=unknown.question,
                    category=unknown.category,
                    importance=unknown.importance,
                    status=unknown.status,
                    evidence_count=0
                )
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error creating unknown: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create unknown"
            }
        )
