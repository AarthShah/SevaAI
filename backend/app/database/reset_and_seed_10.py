"""
Script to reset and seed exactly 10 complaints with realistic multi-location distribution
(including 150m clusters and similar complaints) and GitHub repository before/after photos.
"""

import json
from datetime import datetime, timedelta, timezone
from backend.app.database.session import SessionLocal, Base, engine
from backend.app.database.seed_data import seed_database
from backend.app.models.complaint import Complaint
from backend.app.models.evidence import Evidence
from backend.app.models.complaint_history import ComplaintHistory
from backend.app.models.agent_action import AgentAction
from backend.app.models.resolution_verification import ResolutionEvidence, ResolutionVerification
from backend.app.models.location_intelligence import LocationIntelligence
from backend.app.models.sla_prediction import SLAPrediction
from backend.app.models.duplicate_candidate import DuplicateCandidate
from backend.app.models.complaint_cluster import ComplaintCluster, ComplaintClusterMember
from backend.app.models.watchdog_event import WatchdogEvent

def reset_and_seed():
    db = SessionLocal()
    try:
        # First ensure departments and officers are seeded
        seed_database(db)

        # Clear existing complaint-related records
        db.query(WatchdogEvent).delete()
        db.query(DuplicateCandidate).delete()
        db.query(ComplaintClusterMember).delete()
        db.query(ComplaintCluster).delete()
        db.query(ResolutionVerification).delete()
        db.query(ResolutionEvidence).delete()
        db.query(LocationIntelligence).delete()
        db.query(SLAPrediction).delete()
        db.query(AgentAction).delete()
        db.query(ComplaintHistory).delete()
        db.query(Evidence).delete()
        db.query(Complaint).delete()
        db.commit()
        print("Cleared previous complaints data.")

        now = datetime.now(timezone.utc)

        # 10 Complaints with 5 Categories, Before & After photos, and realistic geospatial distribution
        TEN_COMPLAINTS = [
            # --- Location 1: MG Road / Shivajinagar (Hotspot with 4 complaints within 65m) ---
            {
                "id": "CS1001",
                "citizen_id": 1,
                "category": "road_infrastructure",
                "issue_type": "Pothole Defect",
                "description": "Large deep pothole on MG Road near the college main gate causing traffic choke point and vehicle damage.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Municipal Road Department\nSUBJECT: Urgent Remediation Request - Pothole at MG Road near College Gate\nCLASSIFICATION: Road Infrastructure (Severity: HIGH)",
                "latitude": 18.52040,
                "longitude": 73.85670,
                "address": "MG Road near College Main Gate, Pune",
                "severity": "HIGH",
                "status": "In Progress",
                "department_id": 1,
                "assigned_officer_id": 1,
                "assigned_officer_name": "Er. Rajesh Patil",
                "assigned_officer_phone": "+91 98230 44101",
                "officer_distance_km": 0.4,
                "officer_eta_minutes": 15,
                "ai_confidence": 0.96,
                "before_image": "/image/pathole/before/0428f686-a431-4415-b4f9-9c4d888f2a92.jpg",
                "after_image": "/image/pathole/after/0dc86bc2-7d3c-4b17-bddb-760e35cc3abd.jpg",
                "ward": "Ward 4",
                "zone": "Zone 1 (Central)",
                "landmark": "Fergusson College Main Gate",
                "street": "Mahatma Gandhi Road",
                "sla_hours": 48,
                "sla_predicted": 22,
                "created_at": now - timedelta(hours=14)
            },
            {
                "id": "CS1002",
                "citizen_id": 1,
                "category": "waste_management",
                "issue_type": "Garbage Dump Overflow",
                "description": "Commercial market waste bins overflowing onto pedestrian walkway creating foul odor and hygiene hazard.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Waste Management & Sanitation Department\nSUBJECT: Waste Clearance Notice - MG Road Market Corner",
                "latitude": 18.52055,  # ~22m from CS1001
                "longitude": 73.85685,
                "address": "MG Road Market Corner, Pune",
                "severity": "MEDIUM",
                "status": "Resolved",
                "department_id": 2,
                "assigned_officer_id": 3,
                "assigned_officer_name": "Amit Sharma",
                "assigned_officer_phone": "+91 98230 44103",
                "officer_distance_km": 0.1,
                "officer_eta_minutes": 5,
                "ai_confidence": 0.94,
                "before_image": "/image/garbage/before/0e61bca7-361e-466a-868a-36cae942872e.jpg",
                "after_image": "/image/garbage/after/0151c5e2-0fae-42cb-846b-a28933d1d887.jpg",
                "ward": "Ward 4",
                "zone": "Zone 1 (Central)",
                "landmark": "Central Market Junction",
                "street": "Mahatma Gandhi Road",
                "sla_hours": 24,
                "sla_predicted": 12,
                "created_at": now - timedelta(hours=28)
            },
            {
                "id": "CS1003",
                "citizen_id": 1,
                "category": "road_infrastructure",
                "issue_type": "Road Surface Cavitation",
                "description": "Asphalt top layer eroded with sub-base rutting right at the bus transit stop creating skid risk.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Municipal Road Department\nSUBJECT: Road Cavitation Remediation - MG Road Transit Stop",
                "latitude": 18.52070,  # ~45m from CS1001
                "longitude": 73.85700,
                "address": "MG Road Transit Stop, Pune",
                "severity": "HIGH",
                "status": "Assigned",
                "department_id": 1,
                "assigned_officer_id": 2,
                "assigned_officer_name": "Er. Vikram Shinde",
                "assigned_officer_phone": "+91 98230 44102",
                "officer_distance_km": 0.8,
                "officer_eta_minutes": 25,
                "ai_confidence": 0.92,
                "before_image": "/image/pathole/before/710c9870-fda0-4378-b9da-cac41844bb84.jpg",
                "after_image": "/image/pathole/after/0f2e2a8e-0a5d-4326-8de2-7a72a26a8d66.jpg",
                "ward": "Ward 4",
                "zone": "Zone 1 (Central)",
                "landmark": "City Bus Stop #12",
                "street": "Mahatma Gandhi Road",
                "sla_hours": 48,
                "sla_predicted": 34,
                "created_at": now - timedelta(hours=8)
            },
            {
                "id": "CS1004",
                "citizen_id": 1,
                "category": "electrical_street_lighting",
                "issue_type": "Dark Streetlight Luminaire",
                "description": "Streetlight pole #42 completely unlit creating pitch black road stretch during evening rush hour.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Electrical & Street Lighting Department\nSUBJECT: Streetlight Outage Notice - Pole #42",
                "latitude": 18.52080,  # ~65m from CS1001
                "longitude": 73.85715,
                "address": "MG Road Pole #42, Pune",
                "severity": "LOW",
                "status": "Submitted",
                "department_id": 3,
                "assigned_officer_id": 5,
                "assigned_officer_name": "Suresh Deshmukh",
                "assigned_officer_phone": "+91 98230 44105",
                "officer_distance_km": 1.2,
                "officer_eta_minutes": 35,
                "ai_confidence": 0.91,
                "before_image": "/image/Strretlight/before/7980af27-cf7d-4093-9f04-ce507bd7ff4c.jpg",
                "after_image": "/image/Strretlight/after/447dba68-3a58-44d4-ba9c-e19d70001011.jpg",
                "ward": "Ward 4",
                "zone": "Zone 1 (Central)",
                "landmark": "Opposite SBI Branch",
                "street": "Mahatma Gandhi Road",
                "sla_hours": 48,
                "sla_predicted": 18,
                "created_at": now - timedelta(hours=4)
            },

            # --- Location 2: Deccan Gymkhana (Cluster with 2 complaints within 28m) ---
            {
                "id": "CS1005",
                "citizen_id": 1,
                "category": "water_supply",
                "issue_type": "Main Pipeline Burst",
                "description": "Pressurized potable water leaking continuously from underground distribution line flooding street.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Water Supply & Sewerage Board\nSUBJECT: Potable Water Main Rupture - Deccan Gymkhana Circle",
                "latitude": 18.51800,
                "longitude": 73.85200,
                "address": "Deccan Gymkhana Main Circle, Pune",
                "severity": "HIGH",
                "status": "In Progress",
                "department_id": 4,
                "assigned_officer_id": 6,
                "assigned_officer_name": "Pooja Kulkarni",
                "assigned_officer_phone": "+91 98230 44106",
                "officer_distance_km": 0.3,
                "officer_eta_minutes": 10,
                "ai_confidence": 0.97,
                "before_image": "/image/water_leak/before/23c9fbe3-8d33-4dac-8e87-71b0504d787b.jpg",
                "after_image": "/image/water_leak/after/09fbbc53-0904-4a0a-ba9a-c7d27ffd6c88.jpg",
                "ward": "Ward 7",
                "zone": "Zone 2 (West)",
                "landmark": "Gymkhana Circle Fountain",
                "street": "Karve Road",
                "sla_hours": 24,
                "sla_predicted": 8,
                "created_at": now - timedelta(hours=10)
            },
            {
                "id": "CS1006",
                "citizen_id": 1,
                "category": "drainage_sanitation",
                "issue_type": "Stormwater Culvert Blockage",
                "description": "Monsoon stormwater channel choked with plastic sediment causing water backflow into shops.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Drainage & Stormwater Department\nSUBJECT: Culvert Blockage Remediation - Deccan Lane 2",
                "latitude": 18.51820,  # ~28m from CS1005
                "longitude": 73.85215,
                "address": "Deccan Gymkhana Lane 2, Pune",
                "severity": "MEDIUM",
                "status": "Submitted",
                "department_id": 5,
                "assigned_officer_id": 7,
                "assigned_officer_name": "Sachin More",
                "assigned_officer_phone": "+91 98230 44107",
                "officer_distance_km": 1.5,
                "officer_eta_minutes": 40,
                "ai_confidence": 0.93,
                "before_image": "/image/Storm%20drainage/before/233e9aff-0079-4caa-a0be-b5bb62ff4ef2.jpg",
                "after_image": "/image/Storm%20drainage/after/0cda410f-1d4b-4b5d-908d-c20e26df910b.jpg",
                "ward": "Ward 7",
                "zone": "Zone 2 (West)",
                "landmark": "Deccan Post Office",
                "street": "Lane 2, Gymkhana Road",
                "sla_hours": 24,
                "sla_predicted": 16,
                "created_at": now - timedelta(hours=6)
            },

            # --- Location 3: Paud Road, Kothrud (~4km away) ---
            {
                "id": "CS1007",
                "citizen_id": 1,
                "category": "waste_management",
                "issue_type": "Public Dump Accumulation",
                "description": "Solid household and packaging waste accumulated along Paud Road boundary wall.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Waste Management & Sanitation Department\nSUBJECT: Refuse Clearance - Paud Road",
                "latitude": 18.50800,
                "longitude": 73.83500,
                "address": "Paud Road, Kothrud, Pune",
                "severity": "MEDIUM",
                "status": "Assigned",
                "department_id": 2,
                "assigned_officer_id": 4,
                "assigned_officer_name": "Pooja Gaikwad",
                "assigned_officer_phone": "+91 98230 44104",
                "officer_distance_km": 0.6,
                "officer_eta_minutes": 20,
                "ai_confidence": 0.95,
                "before_image": "/image/garbage/before/15c24116-be33-4c0f-8aad-7ebb5f96f34c.jpg",
                "after_image": "/image/garbage/after/2aafbdbc-acc9-429c-85ca-63e7e740e726.jpg",
                "ward": "Ward 11",
                "zone": "Zone 4 (South-West)",
                "landmark": "Kothrud Depot Bus Stop",
                "street": "Paud Road",
                "sla_hours": 24,
                "sla_predicted": 14,
                "created_at": now - timedelta(hours=16)
            },

            # --- Location 4: Model Colony (~3km away) ---
            {
                "id": "CS1008",
                "citizen_id": 1,
                "category": "electrical_street_lighting",
                "issue_type": "Defective Streetlight Pole",
                "description": "Armature damaged with exposed wiring and non-illuminating LED panel.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Electrical & Street Lighting Department\nSUBJECT: Armature Repair - Lane 3 Model Colony",
                "latitude": 18.53500,
                "longitude": 73.84000,
                "address": "Lane 3, Model Colony, Pune",
                "severity": "LOW",
                "status": "Resolved",
                "department_id": 3,
                "assigned_officer_id": 5,
                "assigned_officer_name": "Suresh Deshmukh",
                "assigned_officer_phone": "+91 98230 44105",
                "officer_distance_km": 0.2,
                "officer_eta_minutes": 8,
                "ai_confidence": 0.90,
                "before_image": "/image/Strretlight/before/a05f46f6-17e6-48e4-bc82-542fc1eccee0.jpg",
                "after_image": "/image/Strretlight/after/6602ed39-eaca-4aab-9e63-cdbb167b127a.jpg",
                "ward": "Ward 2",
                "zone": "Zone 1 (North)",
                "landmark": "Model Colony Park",
                "street": "Lakaki Road",
                "sla_hours": 48,
                "sla_predicted": 20,
                "created_at": now - timedelta(days=2)
            },

            # --- Location 5: Swargate (~3.5km away) ---
            {
                "id": "CS1009",
                "citizen_id": 1,
                "category": "drainage_sanitation",
                "issue_type": "Missing Sidewalk Manhole Cover",
                "description": "Cast iron stormwater chamber lid missing creating extreme drop hazard on sidewalk.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Drainage & Stormwater Department\nSUBJECT: CRITICAL - Missing Manhole Lid at Swargate Bus Depot",
                "latitude": 18.50200,
                "longitude": 73.86000,
                "address": "Swargate Bus Depot Outer Road, Pune",
                "severity": "CRITICAL",
                "status": "In Progress",
                "department_id": 5,
                "assigned_officer_id": 7,
                "assigned_officer_name": "Sachin More",
                "assigned_officer_phone": "+91 98230 44107",
                "officer_distance_km": 0.5,
                "officer_eta_minutes": 12,
                "ai_confidence": 0.99,
                "before_image": "/image/Storm%20drainage/before/d954fcbc-4eb9-45cc-88f8-03f29ce3f589.jpg",
                "after_image": "/image/Storm%20drainage/after/3ac60346-c673-4700-9a02-30bc79f2fc8e.jpg",
                "ward": "Ward 9",
                "zone": "Zone 3 (South)",
                "landmark": "Swargate Inter-city Bus Depot",
                "street": "Satara Road",
                "sla_hours": 24,
                "sla_predicted": 6,
                "created_at": now - timedelta(hours=3)
            },

            # --- Location 6: Station Road (~2.8km away) ---
            {
                "id": "CS1010",
                "citizen_id": 1,
                "category": "water_supply",
                "issue_type": "Sub-surface Pipe Seepage",
                "description": "Continuous freshwater bubbling up through roadway expansion joints under overbridge.",
                "generated_complaint": "OFFICIAL CIVIC GRIEVANCE NOTICE\nTO: Water Supply & Sewerage Board\nSUBJECT: Pipe Seepage Remediation - Station Road Overbridge",
                "latitude": 18.52800,
                "longitude": 73.86500,
                "address": "Station Road Railway Overbridge, Pune",
                "severity": "HIGH",
                "status": "Submitted",
                "department_id": 4,
                "assigned_officer_id": 6,
                "assigned_officer_name": "Pooja Kulkarni",
                "assigned_officer_phone": "+91 98230 44106",
                "officer_distance_km": 1.1,
                "officer_eta_minutes": 30,
                "ai_confidence": 0.94,
                "before_image": "/image/water_leak/before/4044b138-a258-4d0d-812d-a60ebda8ef19.jpg",
                "after_image": "/image/water_leak/after/340b3418-41fd-467a-a50a-ca0397210859.jpg",
                "ward": "Ward 3",
                "zone": "Zone 1 (East)",
                "landmark": "Pune Junction Station Overbridge",
                "street": "Station Road",
                "sla_hours": 24,
                "sla_predicted": 18,
                "created_at": now - timedelta(hours=5)
            }
        ]

        for item in TEN_COMPLAINTS:
            cid = item["id"]
            c = Complaint(
                id=cid,
                citizen_id=item["citizen_id"],
                category=item["category"],
                issue_type=item["issue_type"],
                description=item["description"],
                generated_complaint=item["generated_complaint"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                address=item["address"],
                severity=item["severity"],
                status=item["status"],
                department_id=item["department_id"],
                assigned_officer_id=item.get("assigned_officer_id"),
                assigned_officer_name=item.get("assigned_officer_name"),
                assigned_officer_phone=item.get("assigned_officer_phone"),
                officer_distance_km=item.get("officer_distance_km"),
                officer_eta_minutes=item.get("officer_eta_minutes"),
                ai_confidence=item["ai_confidence"],
                created_at=item["created_at"],
                updated_at=item["created_at"]
            )
            db.add(c)
            db.flush()

            # Add primary evidence (Before Photo)
            db.add(Evidence(
                complaint_id=cid,
                type="image",
                file_url=item["before_image"],
                description=f"Initial physical proof of {item['issue_type']}",
                ai_analysis=f"Computer vision confirmed {item['category']} defect with {int(item['ai_confidence']*100)}% accuracy.",
                created_at=item["created_at"]
            ))

            # Add history
            db.add(ComplaintHistory(
                complaint_id=cid,
                old_status="Draft",
                new_status="Submitted",
                changed_by="Citizen",
                remarks="Citizen filed complaint via mobile portal with physical camera photo",
                timestamp=item["created_at"]
            ))
            if item["status"] in ["Assigned", "In Progress", "Resolved"]:
                db.add(ComplaintHistory(
                    complaint_id=cid,
                    old_status="Submitted",
                    new_status="Assigned",
                    changed_by="AI Zero-Touch Dispatcher",
                    remarks=f"Assigned to {item['assigned_officer_name']} ({item['officer_distance_km']}km away)",
                    timestamp=item["created_at"] + timedelta(minutes=5)
                ))
            if item["status"] in ["In Progress", "Resolved"]:
                db.add(ComplaintHistory(
                    complaint_id=cid,
                    old_status="Assigned",
                    new_status="In Progress",
                    changed_by=item["assigned_officer_name"],
                    remarks="Field squad reached location and initiated physical remediation work",
                    timestamp=item["created_at"] + timedelta(minutes=25)
                ))
            if item["status"] == "Resolved":
                db.add(ComplaintHistory(
                    complaint_id=cid,
                    old_status="In Progress",
                    new_status="Resolved",
                    changed_by=item["assigned_officer_name"],
                    remarks="Physical remediation completed. Post-work photo evidence submitted for supervisor audit.",
                    timestamp=item["created_at"] + timedelta(hours=3)
                ))

            # Add Resolution Evidence (Before and After Photos)
            res_ev = ResolutionEvidence(
                complaint_id=cid,
                worker_id=item.get("assigned_officer_id"),
                worker_name=item.get("assigned_officer_name"),
                before_image_url=item["before_image"],
                after_image_url=item["after_image"],
                resolution_notes=f"Municipal remedial work completed for {item['issue_type']}. Site cleared and restored to standard operational specifications.",
                completion_lat=item["latitude"],
                completion_lon=item["longitude"],
                completion_address=item["address"],
                completed_at=item["created_at"] + timedelta(hours=2)
            )
            db.add(res_ev)
            db.flush()

            # Add Resolution Verification
            db.add(ResolutionVerification(
                resolution_evidence_id=res_ev.id,
                complaint_id=cid,
                status="LIKELY_RESOLVED" if item["status"] == "Resolved" else "PENDING",
                confidence=0.96 if item["status"] == "Resolved" else 0.85,
                authority_decision="CONFIRMED" if item["status"] == "Resolved" else "PENDING",
                authority_notes="Visual defect cleared and verified against pre-work coordinate survey."
            ))

            # Add Location Intelligence
            db.add(LocationIntelligence(
                complaint_id=cid,
                ward=item["ward"],
                zone=item["zone"],
                landmark=item["landmark"],
                street=item["street"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                consistency_flag="CONSISTENT"
            ))

            # Add SLA Prediction
            db.add(SLAPrediction(
                complaint_id=cid,
                target_sla_hours=item["sla_hours"],
                predicted_resolution_hours=item["sla_predicted"],
                sla_breach_probability=0.15 if item["status"] == "Resolved" else 0.28,
                risk_status="ON_TRACK",
                influencing_factors=json.dumps(["Specialist dispatched within 1km radius", "Normal traffic flow on transit corridor"])
            ))

        db.commit()
        print(f"Successfully seeded {len(TEN_COMPLAINTS)} complaints with before/after photos and geospatial clusters.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed()
