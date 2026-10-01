"""Acceptance tests for persistent, evidence-aware master grievances."""

import json
import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.agent_action import AgentAction
from app.models.complaint import Complaint
from app.models.complaint_cluster import ComplaintCluster, ComplaintClusterMember
from app.models.department import Department
from app.models.evidence import Evidence
from app.schemas.complaint import ComplaintStatusUpdate
from app.services.clustering_service import ClusteringService
from app.services.complaint_service import ComplaintService


class MasterGrievanceAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.departments = {}
        for name, category in [
            ("Waste Management & Sanitation Department", "waste_management"),
            ("General Civic Administration", "public_safety_other"),
            ("Road Department", "road_infrastructure"),
            ("Electrical Street Lighting", "electrical_street_lighting"),
        ]:
            department = Department(name=name, category=category)
            self.db.add(department)
            self.db.flush()
            self.departments[category] = department.id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_report(self, report_id, issue, lat, lon, *, category="waste_management", text=None,
                   sha256=None, phash=None, citizen_id=None):
        dept_id = self.departments.get(category)
        report = Complaint(
            id=report_id, citizen_id=citizen_id, category=category, issue_type=issue,
            description=text or f"{issue} reported at this location", latitude=lat, longitude=lon,
            address="Shivaji Park, Kolhapur", severity="HIGH", status="Submitted",
            department_id=dept_id, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
        )
        self.db.add(report)
        self.db.flush()
        if sha256 or phash:
            details = {"provenance_verification": {}}
            if sha256:
                details["provenance_verification"]["sha256"] = sha256
            if phash:
                details["provenance_verification"]["perceptual_hash"] = phash
            self.db.add(Evidence(complaint_id=report_id, type="image", file_url=f"/uploads/{report_id}.jpg",
                                 forensic_details=json.dumps(details)))
            self.db.flush()
        ClusteringService.attach_to_master(self.db, report)
        self.db.flush()
        return report

    def assert_one_master(self, reports, expected_count):
        masters = {report.cluster_id for report in reports}
        self.assertEqual(len(masters), 1)
        master_id = next(iter(masters))
        self.assertIsNotNone(master_id)
        self.assertEqual(self.db.query(ComplaintClusterMember).filter_by(cluster_id=master_id).count(), expected_count)
        details = ClusteringService.get_cluster_details(self.db, master_id)
        self.assertEqual(details["report_count"], expected_count)
        self.assertEqual(details["reporter_count"], expected_count)
        self.assertEqual(details["show_report_count"], expected_count > 1)
        return master_id, details

    def test_1_same_image_different_classification_one_master_and_one_official_decision(self):
        original = self.add_report("CS9008", "Garbage", 16.705496, 74.258388,
                                   category="waste_management", text="Garbage accumulation by the road",
                                   sha256="same-image-digest", phash="00c0e3b7b9a4c35c")
        uncertain = self.add_report("CS9009", "Unclassified Civic Issue", 16.705497, 74.258389,
                                     category="public_safety_other", text="Unclassified civic issue",
                                     sha256="same-image-digest", phash="00c0e3b7b9a4c35c")
        master_id, details = self.assert_one_master([original, uncertain], 2)
        self.assertEqual(details["issue_type"], "Garbage Accumulation")
        self.assertEqual(details["category"], "waste_management")
        self.assertEqual(details["department_id"], self.departments["waste_management"])
        self.assertEqual(original.category, "waste_management")
        self.assertEqual(uncertain.category, "public_safety_other")
        self.assertEqual(original.department_id, self.departments["waste_management"])
        self.assertEqual(uncertain.department_id, self.departments["public_safety_other"])
        self.assertEqual({r["complaint_id"] for r in details["members"]}, {"CS9008", "CS9009"})
        self.assertEqual(sum(len(r["evidence"]) for r in details["members"]), 2)
        self.assertTrue(details["show_report_count"])

        ComplaintService.update_status(self.db, original.id,
            ComplaintStatusUpdate(status="Assigned", department_id=self.departments["waste_management"],
                                  assigned_officer_name="Waste Crew A", remarks="Single master dispatch"))
        ComplaintService.update_status(self.db, uncertain.id,
            ComplaintStatusUpdate(status="Assigned", department_id=self.departments["waste_management"],
                                  assigned_officer_name="Waste Crew A", remarks="Retry of master dispatch"))
        self.assertEqual({r.status for r in [original, uncertain]}, {"Assigned"})
        self.assertEqual(original.department_id, self.departments["waste_management"])
        self.assertEqual(uncertain.department_id, self.departments["public_safety_other"])
        self.assertEqual(self.db.query(AgentAction).filter_by(complaint_id=original.id).count(), 1)
        self.assertEqual(self.db.query(AgentAction).filter_by(complaint_id=uncertain.id).count(), 0)
        ClusteringService.attach_to_master(self.db, original)
        ClusteringService.attach_to_master(self.db, uncertain)
        final_id, final_details = self.assert_one_master([original, uncertain], 2)
        self.assertEqual(final_id, master_id)
        self.assertEqual(original.department_id, self.departments["waste_management"])
        self.assertEqual(uncertain.department_id, self.departments["public_safety_other"])

    def test_2_same_garbage_issue_different_images_within_50m_groups(self):
        a = self.add_report("T2-A", "Garbage accumulation", 16.705400, 74.258300,
                            sha256="image-a", phash="0000000000000000")
        b = self.add_report("T2-B", "Trash accumulation", 16.705650, 74.258300,
                            text="Trash accumulation dumped beside the street", sha256="image-b", phash="ffffffffffffffff")
        master_id, details = self.assert_one_master([a, b], 2)
        self.assertEqual(details["master_grievance_id"], master_id)

    def test_3_same_evidence_overrides_different_ai_classification(self):
        a = self.add_report("T3-A", "Garbage", 16.705400, 74.258300,
                            category="waste_management", text="Waste dumped beside road", sha256="same", phash="1234567890abcdef")
        b = self.add_report("T3-B", "Unclassified Civic Issue", 16.705500, 74.258300,
                            category="public_safety_other", text="Unclassified civic issue", sha256="same", phash="1234567890abcdef")
        self.assert_one_master([a, b], 2)
        self.assertEqual(b.category, "public_safety_other")

    def test_4_garbage_and_broken_streetlight_at_same_location_stay_separate(self):
        garbage = self.add_report("T4-A", "Garbage accumulation", 16.705400, 74.258300,
                                  category="waste_management", text="Garbage accumulation here")
        light = self.add_report("T4-B", "Broken streetlight", 16.705401, 74.258301,
                                category="electrical_street_lighting", text="Streetlight is broken")
        self.assertIsNone(garbage.cluster_id)
        self.assertIsNone(light.cluster_id)
        self.assertEqual(self.db.query(ComplaintCluster).count(), 0)

    def test_5_same_garbage_issue_500m_away_stays_separate(self):
        a = self.add_report("T5-A", "Garbage accumulation", 16.705400, 74.258300)
        b = self.add_report("T5-B", "Garbage accumulation", 16.709900, 74.258300)
        self.assertIsNone(a.cluster_id)
        self.assertIsNone(b.cluster_id)
        self.assertEqual(self.db.query(ComplaintCluster).count(), 0)

    def test_6_single_report_has_no_hierarchy_badge_or_count(self):
        single = self.add_report("T6-A", "Garbage accumulation", 16.705400, 74.258300)
        self.assertIsNone(single.cluster_id)
        self.assertEqual(single.id, single.cluster_id or single.id)
        self.assertEqual(self.db.query(ComplaintCluster).count(), 0)


if __name__ == "__main__":
    unittest.main()
