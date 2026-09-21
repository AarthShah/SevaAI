"""
CivicSeva Knowledge Base
Curated civic repository of municipal department jurisdictions, SOPs,
severity guidelines, and escalation rules for grounding AI decisions.
"""

from typing import List, Dict, Any

CIVIC_KNOWLEDGE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "KB_ROAD_001",
        "category": "road_infrastructure",
        "department": "Municipal Road Department",
        "title": "Road Surface Defects, Potholes & Asphalt Degradation",
        "content": (
            "The Municipal Road Department is solely responsible for maintaining asphalt surfaces, "
            "repairing potholes, managing road resurfacing, structural crack filling, and pavement integrity. "
            "Potholes exceeding 10cm depth or situated on arterial transit corridors present acute vehicular "
            "and pedestrian hazards and must be categorized as HIGH or CRITICAL severity. "
            "Standard response SLA: Emergency hazard containment within 24 hours, patch completion within 72 hours."
        ),
        "tags": ["pothole", "asphalt", "crater", "road", "tar", "pavement", "highway", "street"]
    },
    {
        "id": "KB_ROAD_002",
        "category": "road_infrastructure",
        "department": "Municipal Road Department",
        "title": "Road Structural Damage, Caved-in Roads & Speed Breaker Malfunctions",
        "content": (
            "Damage to road curbs, collapsed retaining embankments, caved-in roadbeds, and unauthorized or "
            "damaged speed breakers fall under Civil & Road Engineering. Structural caving poses immediate risk "
            "of vehicular rollover and requires instant cordoning and CRITICAL triage."
        ),
        "tags": ["road_damage", "cave-in", "curb", "speed breaker", "subsidence", "median"]
    },
    {
        "id": "KB_WASTE_001",
        "category": "waste_management",
        "department": "Waste Management & Sanitation Department",
        "title": "Solid Waste Accumulation, Illegal Dumping & Overflowing Bins",
        "content": (
            "The Waste Management and Sanitation Department handles municipal solid waste collection, "
            "dumper bin clearing, clearing of unauthorized garbage dumps, and street sweeping. "
            "Garbage accumulation blocking pedestrian walkways or accumulating near residential kitchens and schools "
            "constitutes a public bio-hazard (vector-borne diseases) requiring HIGH severity designation. "
            "Standard clearance SLA: 24-48 hours."
        ),
        "tags": ["garbage", "trash", "waste", "dump", "debris", "litter", "rubbish", "refuse", "bin"]
    },
    {
        "id": "KB_ELECTRICAL_001",
        "category": "electrical_street_lighting",
        "department": "Electrical & Street Lighting Department",
        "title": "Streetlight Outages, Exposed Wiring & Pole Structural Integrity",
        "content": (
            "The Electrical & Street Lighting Department oversees public illumination infrastructure, "
            "LED luminaire maintenance, feeder pillar repairs, and wiring safety. "
            "A single isolated dark light is considered LOW to MEDIUM severity. However, entire dark stretches "
            "or exposed live wires accessible to citizens or children are deemed CRITICAL severity due to electrocution risk. "
            "Standard SLA: Exposed wiring secured within 4 hours; luminaire replacement within 48 hours."
        ),
        "tags": ["streetlight", "light", "electrical", "lamp", "pole", "wire", "darkness", "electrocution", "blackout"]
    },
    {
        "id": "KB_WATER_001",
        "category": "water_supply",
        "department": "Water Supply & Sewerage Board",
        "title": "Pipeline Bursts, Potable Water Leakage & Contamination",
        "content": (
            "The Water Supply & Sewerage Board governs potable water distribution networks, main transmission conduits, "
            "pressure valves, and residential supply lines. Potable water pipe bursts resulting in high-volume "
            "surface water loss or road undermining must be classified as HIGH severity. Contaminated supply "
            "poses immediate public health contagion risks and warrants CRITICAL severity."
        ),
        "tags": ["water_leakage", "water leak", "pipeline", "pipe burst", "potable water", "valve", "drinking water"]
    },
    {
        "id": "KB_DRAINAGE_001",
        "category": "drainage_sanitation",
        "department": "Drainage & Stormwater Department",
        "title": "Drain Blockages, Overflowing Sewage, Stormwater Clogging & Missing Manholes",
        "content": (
            "The Drainage & Stormwater Department maintains subterranean storm drains, culverts, sewer channels, "
            "and manhole covers. Missing or cracked manhole lids represent lethal drop hazards for motorists and "
            "pedestrians and are classified as CRITICAL severity. Sewage overflows causing foul odors and street flooding "
            "require immediate jetting within 24 hours (HIGH severity)."
        ),
        "tags": ["drainage", "sewage", "drain", "manhole", "gutter", "clogged", "overflow", "stormwater", "stench"]
    },
    {
        "id": "KB_ESCALATION_001",
        "category": "escalation_rules",
        "department": "Municipal Ombudsman & Civic Vigilance",
        "title": "Civic Complaint Escalation Policy and SLA Timelines",
        "content": (
            "Complaints that remain unattended or unassigned past their prescribed SLA threshold trigger automated "
            "escalation recommendations. Level 1: Ward Officer notification if unresolved after configured threshold "
            "(24 hours for High, 48 hours for Medium, 72 hours for Low). Level 2: Zonal Commissioner escalation if "
            "unresolved after 2x threshold. Level 3: Municipal Commissioner & Ombudsman review if safety risk remains."
        ),
        "tags": ["escalation", "sla", "overdue", "unresolved", "delay", "ombudsman", "vigilance"]
    }
]

DEPARTMENT_CONFIG = {
    "road_infrastructure": {
        "name": "Municipal Road Department",
        "code": "DEPT_ROAD",
        "contact_email": "roads@civicseva.org",
        "contact_phone": "+91 20 2550 1101",
        "office_location": "Civic Center, Block A, Engineering Wing",
        "default_sla_hours": 48
    },
    "waste_management": {
        "name": "Waste Management & Sanitation Department",
        "code": "DEPT_WASTE",
        "contact_email": "sanitation@civicseva.org",
        "contact_phone": "+91 20 2550 1102",
        "office_location": "Civic Center, Block C, Public Health Division",
        "default_sla_hours": 24
    },
    "electrical_street_lighting": {
        "name": "Electrical & Street Lighting Department",
        "code": "DEPT_ELECTRICAL",
        "contact_email": "lighting@civicseva.org",
        "contact_phone": "+91 20 2550 1103",
        "office_location": "Utility Yard, Power Substation Complex",
        "default_sla_hours": 48
    },
    "water_supply": {
        "name": "Water Supply & Sewerage Board",
        "code": "DEPT_WATER",
        "contact_email": "water@civicseva.org",
        "contact_phone": "+91 20 2550 1104",
        "office_location": "Water Works Complex, Distribution Hub",
        "default_sla_hours": 24
    },
    "drainage_sanitation": {
        "name": "Drainage & Stormwater Department",
        "code": "DEPT_DRAINAGE",
        "contact_email": "drainage@civicseva.org",
        "contact_phone": "+91 20 2550 1105",
        "office_location": "Sanitation Building, Drainage Operations",
        "default_sla_hours": 24
    },
    "public_safety_other": {
        "name": "General Civic Administration",
        "code": "DEPT_GEN_ADMIN",
        "contact_email": "civic-support@civicseva.org",
        "contact_phone": "+91 20 2550 1100",
        "office_location": "Central Municipal Headquarters",
        "default_sla_hours": 72
    }
}
