"""
CivicSeva Information Extractor
Extracts contextual entities from citizen complaints:
- Geographic landmarks & road names
- Hazard indicators (deep, live wire, children, hospital, traffic block)
- Urgency cues
"""

import re
from typing import Dict, Any, List

URGENT_CUES = [
    "danger", "dangerous", "urgent", "emergency", "accident", "injured",
    "children", "school", "hospital", "sparking", "electrocution",
    "collapsed", "caved in", "deep", "fatal", "flood", "massive", "huge"
]

LANDMARK_PATTERNS = [
    r'(?:near|opp|opposite|beside|behind|in front of|at|around)\s+([A-Za-z0-9\s,]+?)(?:\.|$|,|\bfor\b|\band\b)',
    r'(?:gate|circle|square|road|lane|street|chowk|nagar|colony|market|complex|school|college|hospital)\b'
]

class InformationExtractor:
    def extract(self, text: str) -> Dict[str, Any]:
        if not text:
            return {
                "urgency_markers": [],
                "is_urgent": False,
                "landmarks": [],
                "clean_summary": ""
            }

        lower = text.lower()
        
        # Check urgency markers
        urgency_markers = [cue for cue in URGENT_CUES if cue in lower]
        is_urgent = len(urgency_markers) >= 2 or any(c in lower for c in ["accident", "electrocution", "school", "hospital", "collapsed"])

        # Extract landmarks
        landmarks: List[str] = []
        for pattern in LANDMARK_PATTERNS:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            for m in matches:
                if isinstance(m, str):
                    clean_m = m.strip()
                    if 3 < len(clean_m) < 40 and clean_m not in landmarks:
                        landmarks.append(clean_m)

        return {
            "urgency_markers": urgency_markers,
            "is_urgent": is_urgent,
            "landmarks": landmarks[:3],
            "text_length": len(text)
        }

extractor = InformationExtractor()
