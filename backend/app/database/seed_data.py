"""
CivicSeva Database Seeder
Populates initial municipal departments, standard demo users, and demo complaints
(CS1001, CS1002, CS1003, CS1004, CS1005) for instant hackathon demonstration.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from ..models.user import User
from ..models.department import Department
from ..models.officer import Officer
from ..models.complaint import Complaint
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.evidence import Evidence
from ..models.escalation import Escalation
from ..models.notification import Notification
from ..utils.security import get_password_hash

def seed_database(db: Session):
    # 1. Seed Departments
    departments_data = [
        {
            "id": 1,
            "name": "Municipal Road Department",
            "category": "road_infrastructure",
            "location": "Civic Center, Block A, Engineering Wing",
            "contact": "+91 20 2550 1101",
            "email": "roads@civicseva.org",
            "sla_hours": 48
        },
        {
            "id": 2,
            "name": "Waste Management & Sanitation Department",
            "category": "waste_management",
            "location": "Civic Center, Block C, Public Health Division",
            "contact": "+91 20 2550 1102",
            "email": "sanitation@civicseva.org",
            "sla_hours": 24
        },
        {
            "id": 3,
            "name": "Electrical & Street Lighting Department",
            "category": "electrical_street_lighting",
            "location": "Utility Yard, Power Substation Complex",
            "contact": "+91 20 2550 1103",
            "email": "lighting@civicseva.org",
            "sla_hours": 48
        },
        {
            "id": 4,
            "name": "Water Supply & Sewerage Board",
            "category": "water_supply",
            "location": "Water Works Complex, Distribution Hub",
            "contact": "+91 20 2550 1104",
            "email": "water@civicseva.org",
            "sla_hours": 24
        },
        {
            "id": 5,
            "name": "Drainage & Stormwater Department",
            "category": "drainage_sanitation",
            "location": "Sanitation Building, Drainage Operations",
            "contact": "+91 20 2550 1105",
            "email": "drainage@civicseva.org",
            "sla_hours": 24
        },
        {
            "id": 6,
            "name": "General Civic Administration",
            "category": "public_safety_other",
            "location": "Central Municipal Headquarters",
            "contact": "+91 20 2550 1100",
            "email": "support@civicseva.org",
            "sla_hours": 72
        }
    ]

    for d_data in departments_data:
        existing_dept = db.query(Department).filter(Department.id == d_data["id"]).first()
        if not existing_dept:
            db.add(Department(**d_data))
    db.commit()

    # 2. Seed Standard Demo Users
    users_data = [
        {
            "id": 1,
            "name": "Aarth Shah (Citizen)",
            "email": "citizen@civicseva.org",
            "password_hash": get_password_hash("citizen123"),
            "role": "citizen"
        },
        {
            "id": 2,
            "name": "Officer Rajesh Deshmukh",
            "email": "authority@civicseva.org",
            "password_hash": get_password_hash("authority123"),
            "role": "authority"
        },
        {
            "id": 3,
            "name": "Commissioner Sunita Patil",
            "email": "admin@civicseva.org",
            "password_hash": get_password_hash("admin123"),
            "role": "admin"
        }
    ]

    for u_data in users_data:
        existing_user = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing_user:
            db.add(User(**u_data))
    db.commit()

    # 2.5 Seed Municipal Field Officers for Autonomous Geo-Dispatch
    officers_data = [
        {
            "id": 1,
            "name": "Er. Rajesh Patil",
            "role": "Senior Road Civil Engineer",
            "department_id": 1,
            "phone": "+91 98230 44101",
            "email": "rajesh.patil@pmc.gov.in",
            "current_lat": 18.5204,
            "current_lon": 73.8567,
            "current_address": "Shivajinagar Squad Post, Pune",
            "status": "AVAILABLE",
            "active_tickets": 1,
            "rating": 4.9
        },
        {
            "id": 2,
            "name": "Er. Vikram Shinde",
            "role": "Asphalt Maintenance Inspector",
            "department_id": 1,
            "phone": "+91 98230 44102",
            "email": "vikram.shinde@pmc.gov.in",
            "current_lat": 18.5280,
            "current_lon": 73.8650,
            "current_address": "Station Road Maintenance Yard, Pune",
            "status": "AVAILABLE",
            "active_tickets": 0,
            "rating": 4.8
        },
        {
            "id": 3,
            "name": "Amit Sharma",
            "role": "Sanitation Field Squad Lead",
            "department_id": 2,
            "phone": "+91 98230 44103",
            "email": "amit.sharma@pmc.gov.in",
            "current_lat": 18.5150,
            "current_lon": 73.8500,
            "current_address": "Central Market Sanitation Depot, Pune",
            "status": "AVAILABLE",
            "active_tickets": 1,
            "rating": 4.7
        },
        {
            "id": 4,
            "name": "Pooja Gaikwad",
            "role": "Solid Waste Compliance Officer",
            "department_id": 2,
            "phone": "+91 98230 44104",
            "email": "pooja.gaikwad@pmc.gov.in",
            "current_lat": 18.5080,
            "current_lon": 73.8350,
            "current_address": "Kothrud Sanitation Hub, Pune",
            "status": "AVAILABLE",
            "active_tickets": 0,
            "rating": 4.9
        },
        {
            "id": 5,
            "name": "Suresh Deshmukh",
            "role": "Street Lighting Grid Supervisor",
            "department_id": 3,
            "phone": "+91 98230 44105",
            "email": "suresh.deshmukh@pmc.gov.in",
            "current_lat": 18.5350,
            "current_lon": 73.8400,
            "current_address": "Outer Bypass Utility Yard, Pune",
            "status": "AVAILABLE",
            "active_tickets": 1,
            "rating": 4.8
        },
        {
            "id": 6,
            "name": "Pooja Kulkarni",
            "role": "Water Pipeline Operations Engineer",
            "department_id": 4,
            "phone": "+91 98230 44106",
            "email": "pooja.kulkarni@pmc.gov.in",
            "current_lat": 18.5180,
            "current_lon": 73.8520,
            "current_address": "Deccan Water Distribution Station, Pune",
            "status": "AVAILABLE",
            "active_tickets": 0,
            "rating": 4.9
        },
        {
            "id": 7,
            "name": "Sachin More",
            "role": "Stormwater Drainage Technician",
            "department_id": 5,
            "phone": "+91 98230 44107",
            "email": "sachin.more@pmc.gov.in",
            "current_lat": 18.5020,
            "current_lon": 73.8600,
            "current_address": "Swargate Pumping Station, Pune",
            "status": "AVAILABLE",
            "active_tickets": 1,
            "rating": 4.7
        },
        {
            "id": 8,
            "name": "Deepak Chavan",
            "role": "Emergency Public Works Officer",
            "department_id": 6,
            "phone": "+91 98230 44108",
            "email": "deepak.chavan@pmc.gov.in",
            "current_lat": 18.5220,
            "current_lon": 73.8580,
            "current_address": "PMC Central Command, Pune",
            "status": "AVAILABLE",
            "active_tickets": 0,
            "rating": 4.9
        }
    ]

    for o_data in officers_data:
        existing_officer = db.query(Officer).filter(Officer.id == o_data["id"]).first()
        if not existing_officer:
            db.add(Officer(**o_data))
    db.commit()

    # 3. Seed Demo Complaints
    now = datetime.now(timezone.utc)
    demo_complaints = [
        {
            "id": "CS1001",
            "citizen_id": 1,
            "category": "road_infrastructure",
            "issue_type": "POTHOLE",
            "description": "Large deep pothole on MG Road near the college main gate causing traffic choke point and bike skids.",
            "generated_complaint": (
                "OFFICIAL CIVIC GRIEVANCE NOTICE\n"
                "TO: Municipal Road Department\n"
                "SUBJECT: Urgent Remediation Request - Pothole at MG Road near College Gate\n"
                "CLASSIFICATION: Road Infrastructure (Severity: HIGH)\n\n"
                "INCIDENT SUMMARY: Serious road cavitation on transit artery. High probability of two-wheeler accidents.\n"
                "REQUESTED RELIEF: Immediate cold-mix asphalt patching within 24 hours."
            ),
            "latitude": 18.5204,
            "longitude": 73.8567,
            "address": "MG Road near College Main Gate, Pune",
            "severity": "HIGH",
            "status": "In Progress",
            "department_id": 1,
            "ai_confidence": 0.94,
            "severity_reason": "AI-estimated severity: HIGH. Reported defect presents substantial vehicular traffic disruption on active artery.",
            "grounded_explanation": "Road surface repairs fall under the Municipal Road Department per SOP KB_ROAD_001.",
            "recommended_action": "Assign road maintenance gang for cold mix patching.",
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(hours=6),
            "evidence": [
                {
                    "type": "image",
                    "file_url": "/sample_evidence/pothole.jpg",
                    "description": "Visible asphalt depression with irregular perimeter cracks.",
                    "ai_analysis": "Computer vision verified concentrated road crater."
                }
            ],
            "history": [
                {"old_status": "Draft", "new_status": "Submitted", "changed_by": "Citizen", "remarks": "Submitted with image evidence", "timestamp": now - timedelta(days=2)},
                {"old_status": "Submitted", "new_status": "Assigned", "changed_by": "Officer Rajesh Deshmukh", "remarks": "Assigned to Ward 4 Road Maintenance Squad", "timestamp": now - timedelta(days=1)},
                {"old_status": "Assigned", "new_status": "In Progress", "changed_by": "Officer Rajesh Deshmukh", "remarks": "Road patching crew dispatched to site", "timestamp": now - timedelta(hours=6)}
            ],
            "actions": [
                {"agent_name": "Input Analyzer", "action": "Ingest Multimodal Inputs", "input_summary": "Text + Pothole photo + GPS", "output_summary": "Verified multimodal payload"},
                {"agent_name": "Classification Agent", "action": "Classify Civic Issue", "input_summary": "MG Road pothole photo", "output_summary": "Classified as POTHOLE (94% confidence)"},
                {"agent_name": "Severity Agent", "action": "Estimate Severity", "input_summary": "Arterial road traffic obstruction", "output_summary": "Assessed AI-estimated severity: HIGH"},
                {"agent_name": "Department Agent", "action": "Map Department", "input_summary": "Road infrastructure category", "output_summary": "Mapped to Municipal Road Department"},
                {"agent_name": "Complaint Generator", "action": "Synthesize Notice", "input_summary": "Pothole parameters", "output_summary": "Official grievance draft generated"}
            ]
        },
        {
            "id": "CS1002",
            "citizen_id": 1,
            "category": "waste_management",
            "issue_type": "GARBAGE",
            "description": "Massive uncollected solid waste accumulating outside community center for three consecutive days.",
            "generated_complaint": (
                "OFFICIAL CIVIC GRIEVANCE NOTICE\n"
                "TO: Waste Management & Sanitation Department\n"
                "SUBJECT: Urgent Remediation Request - Garbage Accumulation at Station Road Community Center\n"
                "CLASSIFICATION: Waste Management (Severity: MEDIUM)\n\n"
                "INCIDENT SUMMARY: Rotting solid waste and overflowing bins creating public health nuisance."
            ),
            "latitude": 18.5280,
            "longitude": 73.8650,
            "address": "Station Road Community Center, Pune",
            "severity": "MEDIUM",
            "status": "Submitted",
            "department_id": 2,
            "ai_confidence": 0.92,
            "severity_reason": "AI-estimated severity: MEDIUM. Bio-hazard and foul odor near community public facility.",
            "grounded_explanation": "Solid waste clearance falls under the Waste Management & Sanitation Department per KB_WASTE_001.",
            "recommended_action": "Deploy sanitation compactor truck for refuse clearance.",
            "created_at": now - timedelta(hours=18),
            "updated_at": now - timedelta(hours=18),
            "evidence": [
                {
                    "type": "image",
                    "file_url": "/sample_evidence/garbage.jpg",
                    "description": "Overflowing waste dumper bin with scattered plastic waste.",
                    "ai_analysis": "Computer vision identified high color entropy and uncontained debris."
                }
            ],
            "history": [
                {"old_status": "Draft", "new_status": "Submitted", "changed_by": "Citizen", "remarks": "Complaint submitted via web portal", "timestamp": now - timedelta(hours=18)}
            ],
            "actions": [
                {"agent_name": "Classification Agent", "action": "Classify Civic Issue", "input_summary": "Garbage accumulation text", "output_summary": "Classified as GARBAGE (92% confidence)"},
                {"agent_name": "Department Agent", "action": "Map Department", "input_summary": "Waste management category", "output_summary": "Mapped to Waste Management & Sanitation Department"}
            ]
        },
        {
            "id": "CS1003",
            "citizen_id": 1,
            "category": "electrical_street_lighting",
            "issue_type": "STREETLIGHT",
            "description": "Single streetlight bulb inactive in front of residential building #14 on Lane 3.",
            "generated_complaint": (
                "OFFICIAL CIVIC GRIEVANCE NOTICE\n"
                "TO: Electrical & Street Lighting Department\n"
                "SUBJECT: Luminaire Replacement Request - Lane 3 Residential Area\n"
                "CLASSIFICATION: Street Lighting (Severity: LOW)"
            ),
            "latitude": 18.5350,
            "longitude": 73.8400,
            "address": "Lane 3, Model Colony, Pune",
            "severity": "LOW",
            "status": "Resolved",
            "department_id": 3,
            "ai_confidence": 0.89,
            "severity_reason": "AI-estimated severity: LOW. Isolated single lamp outage; adjacent lights functional.",
            "grounded_explanation": "Public lighting maintenance governed by Electrical & Street Lighting Department per KB_ELECTRICAL_001.",
            "recommended_action": "Replace defective 45W LED luminaire unit.",
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=1),
            "evidence": [
                {
                    "type": "image",
                    "file_url": "/sample_evidence/streetlight.jpg",
                    "description": "Dark streetlight pole fixture.",
                    "ai_analysis": "Low-lux condition identified."
                }
            ],
            "history": [
                {"old_status": "Draft", "new_status": "Submitted", "changed_by": "Citizen", "remarks": "Submitted", "timestamp": now - timedelta(days=4)},
                {"old_status": "Submitted", "new_status": "Assigned", "changed_by": "Officer Rajesh Deshmukh", "remarks": "Assigned to lineman", "timestamp": now - timedelta(days=3)},
                {"old_status": "Assigned", "new_status": "Resolved", "changed_by": "Officer Rajesh Deshmukh", "remarks": "LED lamp fixture replaced. Tested functional.", "timestamp": now - timedelta(days=1)}
            ],
            "actions": [
                {"agent_name": "Classification Agent", "action": "Classify Civic Issue", "input_summary": "Streetlight outage", "output_summary": "Classified as STREETLIGHT (89% confidence)"},
                {"agent_name": "Severity Agent", "action": "Estimate Severity", "input_summary": "Single lamp failure", "output_summary": "Assessed AI-estimated severity: LOW"}
            ]
        },
        {
            "id": "CS1004",
            "citizen_id": 1,
            "category": "water_supply",
            "issue_type": "WATER_LEAKAGE",
            "description": "Clean potable drinking water pipeline burst with heavy stream flooding street for over 50 hours unattended.",
            "generated_complaint": (
                "OFFICIAL CIVIC GRIEVANCE NOTICE\n"
                "TO: Water Supply & Sewerage Board\n"
                "SUBJECT: Severe Potable Pipeline Breach at Market Circle\n"
                "CLASSIFICATION: Water Supply (Severity: HIGH)"
            ),
            "latitude": 18.5150,
            "longitude": 73.8500,
            "address": "Market Circle Main Road, Pune",
            "severity": "HIGH",
            "status": "Escalated",
            "department_id": 4,
            "ai_confidence": 0.95,
            "severity_reason": "AI-estimated severity: HIGH. Severe drinking water wastage causing road erosion.",
            "grounded_explanation": "Water mains maintenance governed by Water Supply Board per KB_WATER_001.",
            "recommended_action": "Emergency isolation valve shutdown and pipe collar replacement.",
            "created_at": now - timedelta(hours=54),
            "updated_at": now - timedelta(hours=2),
            "evidence": [
                {
                    "type": "image",
                    "file_url": "/sample_evidence/water_leak.jpg",
                    "description": "Water gushing from road fissure.",
                    "ai_analysis": "Specular reflection and active liquid pooling confirmed."
                }
            ],
            "history": [
                {"old_status": "Draft", "new_status": "Submitted", "changed_by": "Citizen", "remarks": "Submitted", "timestamp": now - timedelta(hours=54)},
                {"old_status": "Submitted", "new_status": "In Progress", "changed_by": "Officer Rajesh Deshmukh", "remarks": "Under observation", "timestamp": now - timedelta(hours=30)},
                {"old_status": "In Progress", "new_status": "Escalated", "changed_by": "Followup SLA Agent", "remarks": "Escalated to Zonal Commissioner due to >48h SLA breach", "timestamp": now - timedelta(hours=2)}
            ],
            "actions": [
                {"agent_name": "Classification Agent", "action": "Classify Civic Issue", "input_summary": "Water pipeline burst", "output_summary": "Classified as WATER_LEAKAGE (95% confidence)"},
                {"agent_name": "Followup Agent", "action": "Evaluate SLA & Follow-up", "input_summary": "Elapsed: 52h > SLA: 24h", "output_summary": "Follow-up triggered. Escalation recommended."},
                {"agent_name": "Escalation Agent", "action": "Execute Escalation", "input_summary": "Level 1 SLA breach", "output_summary": "Status transitioned to Escalated"}
            ]
        },
        {
            "id": "CS1005",
            "citizen_id": 1,
            "category": "drainage_sanitation",
            "issue_type": "DRAINAGE",
            "description": "Open manhole cover missing on busy pedestrian sidewalk near kindergarten. Severe fall hazard!",
            "generated_complaint": (
                "OFFICIAL CIVIC GRIEVANCE NOTICE\n"
                "TO: Drainage & Stormwater Department\n"
                "SUBJECT: CRITICAL EMERGENCY - Missing Manhole Lid on School Path\n"
                "CLASSIFICATION: Drainage & Stormwater (Severity: CRITICAL)"
            ),
            "latitude": 18.5220,
            "longitude": 73.8590,
            "address": "Bal Shivaji Path near Kindergarten, Pune",
            "severity": "CRITICAL",
            "status": "Acknowledged",
            "department_id": 5,
            "ai_confidence": 0.98,
            "severity_reason": "AI-estimated severity: CRITICAL. Lethal aperture drop hazard in close proximity to young children.",
            "grounded_explanation": "Stormwater apertures and manhole integrity governed by Drainage Department per KB_DRAINAGE_001.",
            "recommended_action": "Immediate physical barricade placement within 1 hour; reinforced concrete cover installation.",
            "created_at": now - timedelta(hours=3),
            "updated_at": now - timedelta(hours=1),
            "evidence": [],
            "history": [
                {"old_status": "Draft", "new_status": "Submitted", "changed_by": "Citizen", "remarks": "Emergency voice complaint registered", "timestamp": now - timedelta(hours=3)},
                {"old_status": "Submitted", "new_status": "Acknowledged", "changed_by": "Commissioner Sunita Patil", "remarks": "Critical triage alert acknowledged by central control", "timestamp": now - timedelta(hours=1)}
            ],
            "actions": [
                {"agent_name": "Classification Agent", "action": "Classify Civic Issue", "input_summary": "Missing manhole cover text", "output_summary": "Classified as DRAINAGE (98% confidence)"},
                {"agent_name": "Severity Agent", "action": "Estimate Severity", "input_summary": "Child safety + open aperture", "output_summary": "Assessed AI-estimated severity: CRITICAL"}
            ]
        }
    ]

    for c_data in demo_complaints:
        cid = c_data["id"]
        existing_c = db.query(Complaint).filter(Complaint.id == cid).first()
        if not existing_c:
            complaint = Complaint(
                id=cid,
                citizen_id=c_data["citizen_id"],
                category=c_data["category"],
                issue_type=c_data["issue_type"],
                description=c_data["description"],
                generated_complaint=c_data["generated_complaint"],
                latitude=c_data["latitude"],
                longitude=c_data["longitude"],
                address=c_data["address"],
                severity=c_data["severity"],
                status=c_data["status"],
                department_id=c_data["department_id"],
                ai_confidence=c_data["ai_confidence"],
                severity_reason=c_data["severity_reason"],
                grounded_explanation=c_data["grounded_explanation"],
                recommended_action=c_data["recommended_action"],
                created_at=c_data["created_at"],
                updated_at=c_data["updated_at"]
            )
            db.add(complaint)
            db.flush()

            for ev_data in c_data.get("evidence", []):
                db.add(Evidence(
                    complaint_id=cid,
                    type=ev_data["type"],
                    file_url=ev_data["file_url"],
                    description=ev_data["description"],
                    ai_analysis=ev_data["ai_analysis"],
                    created_at=c_data["created_at"]
                ))

            for hist_data in c_data.get("history", []):
                db.add(ComplaintHistory(
                    complaint_id=cid,
                    old_status=hist_data["old_status"],
                    new_status=hist_data["new_status"],
                    changed_by=hist_data["changed_by"],
                    remarks=hist_data["remarks"],
                    timestamp=hist_data["timestamp"]
                ))

            for act_data in c_data.get("actions", []):
                db.add(AgentAction(
                    complaint_id=cid,
                    agent_name=act_data["agent_name"],
                    action=act_data["action"],
                    input_summary=act_data["input_summary"],
                    output_summary=act_data["output_summary"],
                    timestamp=c_data["created_at"]
                ))

    # Add initial notification for citizen
    existing_notif = db.query(Notification).filter(Notification.user_id == 1).first()
    if not existing_notif:
        db.add(Notification(
            user_id=1,
            complaint_id="CS1001",
            message="Your complaint #CS1001 (Road Infrastructure) has been assigned to Ward 4 Maintenance Squad."
        ))
        db.add(Notification(
            user_id=1,
            complaint_id="CS1004",
            message="Complaint #CS1004 has exceeded resolution SLA and was escalated to Level 1."
        ))

    db.commit()
