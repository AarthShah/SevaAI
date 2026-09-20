"""
Departments API Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..models.department import Department
from ..schemas.department import DepartmentCreate, DepartmentResponse
from ..middleware.auth_middleware import require_roles

router = APIRouter(prefix="/api/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    """
    Returns all configured municipal departments and their default SLA hours.
    """
    return db.query(Department).all()

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_roles(["admin", "authority"]))
):
    """
    Adds a new configurable municipal department.
    """
    existing = db.query(Department).filter(Department.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{payload.name}' already exists."
        )

    dept = Department(
        name=payload.name,
        category=payload.category,
        location=payload.location,
        contact=payload.contact,
        email=payload.email,
        sla_hours=payload.sla_hours or 48
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept
