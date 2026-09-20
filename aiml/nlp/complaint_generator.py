"""
CivicSeva Complaint Generator
Synthesizes citizen input, vision analysis, location data, and severity into an
official, formal public-works complaint ready for municipal submission.
"""

from typing import Dict, Any, Optional

class ComplaintGenerator:
    def generate_complaint_text(
        self,
        issue_type: str,
        category: str,
        raw_text: str,
        location: Dict[str, Any],
        severity: str,
        department_name: str,
        evidence_summary: Optional[str] = None
    ) -> str:
        """
        Formats a formal, standardized municipal grievance submission text.
        """
        address = location.get("address", "Location coordinates provided on map")
        lat = location.get("latitude")
        lng = location.get("longitude")
        geo_str = f" [GPS: {lat}, {lng}]" if lat and lng else ""

        formatted_issue = issue_type.replace("_", " ").title()
        evidence_str = evidence_summary or "Photographic and contextual evidence attached to complaint docket."

        complaint = (
            f"OFFICIAL CIVIC GRIEVANCE NOTICE\n"
            f"--------------------------------------------------\n"
            f"TO: {department_name}\n"
            f"SUBJECT: Urgent Remediation Request - {formatted_issue} at {address}\n"
            f"CLASSIFICATION: {category.replace('_', ' ').title()} (Severity: {severity})\n\n"
            f"INCIDENT SUMMARY:\n"
            f"The citizen has registered a grievance regarding a reported '{formatted_issue}' defect "
            f"located at {address}{geo_str}.\n\n"
            f"CITIZEN OBSERVATION:\n"
            f"\"{raw_text.strip()}\"\n\n"
            f"TECHNICAL / VISUAL EVIDENCE SUMMARY:\n"
            f"{evidence_str}\n\n"
            f"PUBLIC HAZARD & IMPACT ASSESSMENT:\n"
            f"AI evaluation assessed this issue as '{severity}' priority based on immediate public safety risk, "
            f"vehicular or pedestrian disruption, and infrastructure vulnerability.\n\n"
            f"REQUESTED RELIEF:\n"
            f"1. Immediate physical site verification by the designated ward inspector.\n"
            f"2. Necessary emergency cordoning / safety barrier deployment if applicable.\n"
            f"3. Expedited civil repairs and remedial works under the municipal SLA standard.\n"
            f"4. Updating the CivicSeva tracking system upon commencement and completion of repair works."
        )
        return complaint

generator = ComplaintGenerator()
