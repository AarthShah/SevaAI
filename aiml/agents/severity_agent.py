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

        # If vision detector already evaluated genuine physical severity, use it
        if vision_result and vision_result.get("severity"):
            severity = vision_result["severity"].upper()
            specific_reason = vision_result.get("severity_reason") or f"AI-estimated severity: {severity}."
        else:
            # Accident cues: ONLY if road damage involves accidents, collision, or cave-in does it become HIGH/CRITICAL
            accident_cues = ["accident", "crashed", "crash", "collision", "vehicle damaged", "skid", "injury", "fatal", "deep crater", "highway"]
            has_accident_risk = any(c in lower_text or c in vis_evidence.lower() for c in accident_cues)

            severity_map = {
                "POTHOLE": "HIGH" if (has_accident_risk or is_urgent) else "MEDIUM",
                "ROAD_DAMAGE": "HIGH" if (has_accident_risk or is_urgent) else "MEDIUM",
                "GARBAGE": "HIGH" if ("hospital" in lower_text or "toxic" in lower_text or "chemical" in lower_text) else "MEDIUM",
                "STREETLIGHT": "HIGH" if ("spark" in lower_text or "exposed wire" in lower_text or "hanging wire" in lower_text) else "LOW",
                "WATER_LEAKAGE": "HIGH" if ("main burst" in lower_text or "submerged" in lower_text or "heavy flood" in lower_text) else "MEDIUM",
                "DRAINAGE": "CRITICAL" if ("open manhole" in lower_text or "missing cover" in lower_text) else "MEDIUM",
                "OTHER": "LOW"
            }

            severity = severity_map.get(issue_type.upper(), "MEDIUM")

            # Escalate to CRITICAL only if acute life-safety risk found
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
