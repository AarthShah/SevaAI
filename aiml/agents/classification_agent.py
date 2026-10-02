"""
CivicSeva Classification Agent
Synthesizes multimodal evidence (Text + Vision + Location metadata)
to arrive at a corroborated civic issue classification.
"""

from typing import Dict, Any, Optional
from ..nlp.classifier import classifier
from ..vision.issue_detector import detector

class ClassificationAgent:
    def __init__(self):
        self.name = "ClassificationAgent"

    def execute(
        self,
        text: str,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs multimodal classification and detects corroboration between visual evidence and text.
        """
        # Step 1: Text classification
        text_result = classifier.classify(text)

        # Step 2: Vision analysis if image provided
        vision_result = None
        if image_path or image_bytes:
            target = image_bytes if image_bytes else image_path
            vision_result = detector.analyze_image(target, filename=filename)

        # Step 3: Multimodal synthesis
        final_issue = text_result["issue_type"]
        final_category = text_result["category"]
        final_confidence = text_result["confidence"]
        reason_parts = [text_result["reason"]]
        corroboration = "text_only"

        if vision_result and vision_result.get("detected_issue") not in ["unknown", None]:
            vis_issue = vision_result["detected_issue"].upper()
            vis_cat = vision_result.get("category", final_category)
            vis_evidence = vision_result.get("evidence", "")

            # If user provided generic placeholder or Groq Vision ran, vision leads
            is_generic_text = not text or len(text.strip()) < 15 or "captured via resident photo" in text.lower() or final_issue == "OTHER"
            
            if is_generic_text or vision_result.get("mode") in {"GROQ_QWEN_VISION", "GEMINI_VISION"}:
                final_issue = vis_issue
                final_category = vis_cat
                final_confidence = vision_result.get("confidence", 0.94)
                corroboration = "vision_led_multimodal"
                reason_parts = [f"Multimodal AI vision analysis verified: {vis_evidence}"]
            elif vis_issue == final_issue or (vis_issue in ["ROAD_DAMAGE", "POTHOLE"] and final_issue in ["ROAD_DAMAGE", "POTHOLE"]):
                final_confidence = min(0.98, max(final_confidence, vision_result["confidence"]) + 0.05)
                corroboration = "multimodal_corroborated"
                reason_parts.append(f"Visual evidence independently confirms: {vis_evidence}")
            else:
                final_issue = vis_issue
                final_category = vis_cat
                final_confidence = vision_result.get("confidence", 0.92)
                corroboration = "vision_verified"
                reason_parts.append(f"Physical photographic inspection determined: {vis_evidence}")

        return {
            "agent": self.name,
            "issue_type": final_issue,
            "category": final_category,
            "confidence": round(final_confidence, 2),
            "corroboration": corroboration,
            "reason": " ".join(reason_parts),
            "vision_data": vision_result,
            "text_data": text_result
        }

classification_agent = ClassificationAgent()
