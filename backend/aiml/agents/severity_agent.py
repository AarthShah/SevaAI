"""
CivicSeva Severity Assessment Agent
Calculates AI-estimated severity: LOW, MEDIUM, HIGH, CRITICAL.
Considers physical hazard, traffic obstruction, public health, and contextual urgency markers.
Explicitly frames output as 'AI-estimated severity' with grounded rationale.
"""

from typing import Dict, Any, Optional
from ..nlp.information_extractor import extractor

class SeverityAgent:
    def __init__(self):
        self.name = "SeverityAgent"

    def execute(
        self,
        issue_type: str,
        text: str,
        vision_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Assesses severity level based on safety risks and available evidence.
        """
        info = extractor.extract(text)
        urgency_markers = info.get("urgency_markers", [])
        is_urgent = info.get("is_urgent", False)
        lower_text = text.lower()

        # Evidence clues from vision
        vis_evidence = ""
        if vision_result:
            vis_evidence = vision_result.get("evidence", "")

        # Default baseline per issue type
        severity_map = {
            "POTHOLE": "HIGH" if ("busy" in lower_text or "main road" in lower_text or is_urgent) else "MEDIUM",
            "GARBAGE": "HIGH" if ("school" in lower_text or "hospital" in lower_text or "stench" in lower_text) else "MEDIUM",
            "STREETLIGHT": "HIGH" if ("dark stretch" in lower_text or "wire" in lower_text or "unsafe" in lower_text) else "LOW",
            "WATER_LEAKAGE": "HIGH" if ("burst" in lower_text or "flooding" in lower_text or "gushing" in lower_text) else "MEDIUM",
            "DRAINAGE": "CRITICAL" if ("open manhole" in lower_text or "falling" in lower_text or "manhole missing" in lower_text) else "HIGH",
            "ROAD_DAMAGE": "CRITICAL" if ("cave-in" in lower_text or "caved in" in lower_text or "collapsed" in lower_text) else "HIGH",
            "OTHER": "LOW"
        }

        severity = severity_map.get(issue_type.upper(), "MEDIUM")

        # Escalate to CRITICAL if acute life-safety risk found
        critical_cues = ["electrocution", "exposed wire", "open manhole", "cave-in", "caved in", "collapsed road", "fatal"]
        if any(c in lower_text for c in critical_cues) or any(c in vis_evidence.lower() for c in critical_cues):
            severity = "CRITICAL"

        # Formulate grounded reason
        reasons = {
            "CRITICAL": (
                "AI-estimated severity: CRITICAL. Evidence indicates immediate public danger or lethal hazard "
                "(such as structural collapse, open sewer apertures, or live electrical exposure) requiring instant cordoning."
            ),
            "HIGH": (
                "AI-estimated severity: HIGH. Reported defect presents substantial vehicular traffic disruption, "
                "risk of vehicle damage/injury, or severe bio-sanitation risk on active public thoroughfares."
            ),
            "MEDIUM": (
                "AI-estimated severity: MEDIUM. Infrastructure defect is notable and degrading, causing citizen inconvenience, "
                "requiring scheduled priority municipal remediation before secondary deterioration occurs."
            ),
            "LOW": (
                "AI-estimated severity: LOW. Minor cosmetic or isolated civic defect posing negligible immediate hazard; "
                "suitable for routine municipal maintenance turnaround."
            )
        }

        specific_reason = reasons.get(severity, reasons["MEDIUM"])
        if urgency_markers:
            specific_reason += f" Contextual urgency markers detected: {', '.join(urgency_markers)}."

        confidence = 0.93 if is_urgent or severity in ["CRITICAL", "HIGH"] else 0.88

        return {
            "agent": self.name,
            "severity": severity,
            "display_label": f"AI-estimated severity: {severity}",
            "confidence": confidence,
            "reason": specific_reason,
            "urgency_markers": urgency_markers,
            "risk_factors": {
                "traffic_hazard": severity in ["HIGH", "CRITICAL"] and issue_type in ["POTHOLE", "ROAD_DAMAGE"],
                "public_health_risk": severity in ["HIGH", "CRITICAL"] and issue_type in ["GARBAGE", "DRAINAGE", "WATER_LEAKAGE"],
                "safety_hazard": severity in ["HIGH", "CRITICAL"] and issue_type in ["STREETLIGHT", "DRAINAGE"]
            }
        }

severity_agent = SeverityAgent()
