"""Canonical issue-category and department-code resolution."""

import re
from typing import Optional

from sqlalchemy.orm import Session

from ..models.department import Department


CATEGORY_ALIASES = {
    "road": "road_infrastructure",
    "roads": "road_infrastructure",
    "road_damage": "road_infrastructure",
    "waste": "waste_management",
    "solid_waste": "waste_management",
    "sanitation_waste": "waste_management",
    "sanitation_waste_management": "waste_management",
    "sanitation_and_waste_management": "waste_management",
    "garbage": "waste_management",
    "water": "water_supply",
    "water_leakage": "water_supply",
    "drainage": "drainage_sanitation",
    "drainage_sewerage": "drainage_sanitation",
    "drainage_overflow": "drainage_sanitation",
    "blocked_storm_drain": "drainage_sanitation",
    "storm_drain": "drainage_sanitation",
    "drainage_sewerage": "drainage_sanitation",
    "sewerage": "drainage_sanitation",
    "electrical": "electrical_street_lighting",
    "electricity_lighting": "electrical_street_lighting",
    "street_lighting": "electrical_street_lighting",
    "streetlight": "electrical_street_lighting",
    "street_lighting_electrical": "electrical_street_lighting",
    "public_safety": "public_safety_other",
    "general": "public_safety_other",
}

DEPARTMENT_CODE_CATEGORIES = {
    "ROAD_DEPT": "road_infrastructure",
    "ROADS": "road_infrastructure",
    "ROAD": "road_infrastructure",
    "DEPT_ROAD": "road_infrastructure",
    "WASTE_MGT": "waste_management",
    "WASTE": "waste_management",
    "SOLID_WASTE": "waste_management",
    "DEPT_WASTE": "waste_management",
    "SANITATION": "waste_management",
    "SANITATION_DEPT": "waste_management",
    "STREET_LIGHT": "electrical_street_lighting",
    "ELECTRICITY": "electrical_street_lighting",
    "ELECTRICAL": "electrical_street_lighting",
    "DEPT_ELECTRICAL": "electrical_street_lighting",
    "ELECTRICAL_DEPT": "electrical_street_lighting",
    "WATER_SUPPLY": "water_supply",
    "WATER": "water_supply",
    "WATER_DEPT": "water_supply",
    "DEPT_WATER": "water_supply",
    "DRAINAGE": "drainage_sanitation",
    "DEPT_DRAINAGE": "drainage_sanitation",
    "DEPT_DRAIN": "drainage_sanitation",
    "DRAINAGE_DEPT": "drainage_sanitation",
    "HEALTH_DEPT": "public_safety_other",
    "PUBLIC_SAFETY": "public_safety_other",
    "DEPT_GEN_ADMIN": "public_safety_other",
}


def normalize_department_category(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")
    if not normalized:
        return None
    return CATEGORY_ALIASES.get(normalized, normalized)


def resolve_department_id(
    db: Session,
    category: Optional[str],
    department_ref: Optional[object] = None,
) -> Optional[int]:
    """Resolve a municipal department from the issue category first, then a code/name fallback.

    Category is the source of truth for an identified civic issue. A stale UI code or numeric
    department selection must not route a water, waste, drainage, or electrical issue to roads.
    """
    canonical_category = normalize_department_category(category)
    if canonical_category:
        department = db.query(Department).filter(Department.category == canonical_category).first()
        if department:
            return department.id

    if department_ref is None:
        return None
    if isinstance(department_ref, int) or str(department_ref).strip().isdigit():
        department = db.query(Department).filter(Department.id == int(department_ref)).first()
        return department.id if department else None

    ref = str(department_ref).strip()
    ref_category = DEPARTMENT_CODE_CATEGORIES.get(ref.upper()) or normalize_department_category(ref)
    if ref_category:
        department = db.query(Department).filter(Department.category == ref_category).first()
        if department:
            return department.id

    department = db.query(Department).filter(Department.name.ilike(f"%{ref}%")).first()
    return department.id if department else None
