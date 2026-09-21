"""
CivicSeva Text Issue Classifier
Multi-class intent classifier supporting:
- POTHOLE
- GARBAGE
- STREETLIGHT
- WATER_LEAKAGE
- DRAINAGE
- ROAD_DAMAGE
- OTHER

Calculates issue type, high-level category, confidence score, and clear diagnostic reasoning.
"""

import re
import os
from typing import Dict, Any, Optional

ISSUE_CATEGORIES = {
    "POTHOLE": "road_infrastructure",
    "GARBAGE": "waste_management",
    "STREETLIGHT": "electrical_street_lighting",
    "WATER_LEAKAGE": "water_supply",
    "DRAINAGE": "drainage_sanitation",
    "ROAD_DAMAGE": "road_infrastructure",
    "OTHER": "public_safety_other"
}

KEYWORDS = {
    "POTHOLE": [
        "pothole", "potholes", "crater", "craters", "road pit", "depression in road",
        "cavity", "asphalt hole", "rough patch", "bump", "trench on road"
    ],
    "GARBAGE": [
        "garbage", "trash", "waste", "dump", "debris", "litter", "rubbish",
        "dustbin", "overflowing bin", "refuse", "plastic waste", "filth"
    ],
    "STREETLIGHT": [
        "streetlight", "street light", "lamp post", "pole light", "dark road",
        "no light", "street illumination", "flickering light", "broken bulb", "darkness",
        "exposed wire", "electric pole"
    ],
    "WATER_LEAKAGE": [
        "water leak", "water leakage", "pipe burst", "burst pipe", "drinking water",
        "potable water", "pipeline broken", "water flowing on road", "water gushing",
        "pipeline crack", "valve leak"
    ],
    "DRAINAGE": [
        "drain", "drainage", "sewage", "sewer", "gutter", "manhole", "open manhole",
        "clogged drain", "drain overflowing", "foul smell", "stagnant water", "choked drain"
    ],
    "ROAD_DAMAGE": [
        "road damage", "damaged road", "cracked road", "broken divider", "road cave",
        "cave-in", "collapsed curb", "broken footpath", "pavement broken", "curbstone",
        "speed breaker broken"
    ]
}

class IssueClassifier:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY")

    def classify(self, text: str) -> Dict[str, Any]:
        """
        Classifies citizen complaint text into one of the canonical civic issue classes.
        """
        if not text or not text.strip():
            return {
                "issue_type": "OTHER",
                "category": "public_safety_other",
                "confidence": 0.50,
                "reason": "Insufficient textual detail provided; classified as General Civic inquiry.",
                "keywords_matched": []
            }

        clean_text = text.lower()
        scores: Dict[str, float] = {}
        matched_dict: Dict[str, list] = {}

        for issue_type, kw_list in KEYWORDS.items():
            matches = []
            score = 0.0
            for kw in kw_list:
                # Exact phrase matching
                if kw in clean_text:
                    matches.append(kw)
                    # Give higher weight to multi-word specific phrases
                    score += 2.0 if " " in kw else 1.2

            if matches:
                scores[issue_type] = score
                matched_dict[issue_type] = matches

        if not scores:
            return {
                "issue_type": "OTHER",
                "category": "public_safety_other",
                "confidence": 0.65,
                "reason": "Text does not contain unambiguous civic keywords; routed to General Civic Administration.",
                "keywords_matched": []
            }

        # Select highest scoring issue
        top_issue = max(scores, key=scores.get)
        top_score = scores[top_issue]
        
        # Calculate normalized confidence (bounded between 0.78 and 0.98)
        confidence = min(0.98, 0.76 + (min(top_score, 6.0) / 6.0) * 0.20)
        category = ISSUE_CATEGORIES.get(top_issue, "public_safety_other")

        matched_phrases = matched_dict.get(top_issue, [])
        reason = (
            f"Complaint text explicitly references key indicators: {', '.join(matched_phrases[:3])}. "
            f"Mapped to {category.replace('_', ' ').title()}."
        )

        return {
            "issue_type": top_issue,
            "category": category,
            "confidence": round(confidence, 2),
            "reason": reason,
            "keywords_matched": matched_phrases
        }

classifier = IssueClassifier()
