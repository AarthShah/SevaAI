"""
CivicSeva Central Master Agent
Orchestrates multi-agent civic intelligence:
Input Analyzer -> Classification Agent -> Vision/Evidence Agent -> Severity Agent ->
Department Agent -> Complaint Generator.
Maintains comprehensive action trace for transparent AI accountability.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from .classification_agent import classification_agent
from .severity_agent import severity_agent
from .department_agent import department_agent
from ..nlp.complaint_generator import generator
from ..forensics.authenticity_verifier import authenticity_verifier

class CivicAgent:
    def __init__(self):
        self.name = "CivicSeva Master Agent"

    def analyze_complaint(
        self,
        text: Optional[str] = None,
        voice_transcription: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        image_filename: Optional[str] = None,
        location: Optional[Dict[str, Any]] = None,
        user_info: Optional[Dict[str, Any]] = None,
        configured_departments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes the autonomous agentic analysis pipeline and records step-by-step decision traces.
        """
        trace: List[Dict[str, Any]] = []

        def log_step(agent: str, action: str, inp: str, out: str, status: str = "completed"):
            trace.append({
                "step_index": len(trace) + 1,
                "agent_name": agent,
                "action": action,
                "input_summary": inp,
                "output_summary": out,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 1. Input Ingestion & Fusion
        combined_text = ""
        if text and text.strip():
            combined_text += text.strip()
        if voice_transcription and voice_transcription.strip():
            if combined_text:
                combined_text += f" [Voice Transcript: {voice_transcription.strip()}]"
            else:
                combined_text = voice_transcription.strip()

        loc_data = location or {"latitude": None, "longitude": None, "address": "Location not specified"}
        has_image = bool(image_path or image_bytes)

        log_step(
            agent="Input Analyzer",
            action="Ingest Multimodal Inputs",
            inp=f"Text len: {len(combined_text)}, Has Voice: {bool(voice_transcription)}, Has Image: {has_image}, Location: {loc_data.get('address')}",
            out="Multimodal inputs successfully normalized and verified."
        )

        # 1.5 Evidence Authenticity & Forensics Verification
        authenticity_report = None
        if has_image:
            authenticity_report = authenticity_verifier.verify_evidence(
                image_input=image_bytes or image_path,
                filename=image_filename,
                reported_location=loc_data
            )
            auth_score = authenticity_report["authenticity_score"]
            gateway_action = authenticity_report["decision_gateway"]
            tampering_pct = authenticity_report["forensic_breakdown"]["tampering_analysis"].get("tampering_score", 0.0) * 100.0
            ai_gen_pct = authenticity_report["forensic_breakdown"]["ai_generation_analysis"].get("ai_generated_probability", 0.0) * 100.0
            log_step(
                agent="Evidence Authenticity Agent",
                action="Analyze Tampering & Synthetic Media",
                inp=f"Image: {image_filename or 'attached_evidence'}, Location: {loc_data.get('address')}",
                out=f"Authenticity Score: {auth_score}/100 [{gateway_action}]. Tampering Risk: {tampering_pct:.0f}%, AI-Gen Risk: {ai_gen_pct:.0f}%. {authenticity_report['summary']}"
            )
        else:
            authenticity_report = authenticity_verifier._build_fallback_verdict("Citizen textual complaint; no photographic file attached.")

        # 2. Classification Agent Execution
        cls_result = classification_agent.execute(
            text=combined_text,
            image_path=image_path,
            image_bytes=image_bytes,
            filename=image_filename
        )
        issue_type = cls_result["issue_type"]
        category = cls_result["category"]
        confidence = cls_result["confidence"]

        log_step(
            agent="Classification Agent",
            action="Classify Civic Issue",
            inp=f"Text: '{combined_text[:50]}...', Image attached: {has_image}",
            out=f"Identified as '{issue_type}' under category '{category}' with confidence {int(confidence * 100)}%."
        )

        # 3. Evidence Extraction Agent
        vision_data = cls_result.get("vision_data") or {}

        # Cross-correlate Vision LLM Forensics with Digital Forensics
        groq_forensics = vision_data.get("forensics")
        if groq_forensics and authenticity_report:
            if groq_forensics.get("is_synthetic_ai"):
                authenticity_report["authenticity_score"] = min(authenticity_report.get("authenticity_score", 95.0), 32.0)
                authenticity_report["authenticity_risk"] = "HIGH"
                authenticity_report["decision_gateway"] = "REVIEW"
                authenticity_report["requires_human_review"] = True
                if "audit_flags" in authenticity_report:
                    authenticity_report["audit_flags"].append("Vision LLM detected synthetic/AI-generated visual artifacts")
                if "forensic_breakdown" in authenticity_report and "ai_generation_analysis" in authenticity_report["forensic_breakdown"]:
                    authenticity_report["forensic_breakdown"]["ai_generation_analysis"]["is_synthetic"] = True
                    authenticity_report["forensic_breakdown"]["ai_generation_analysis"]["ai_generated_probability"] = max(
                        authenticity_report["forensic_breakdown"]["ai_generation_analysis"].get("ai_generated_probability", 0.0),
                        groq_forensics.get("synthetic_probability", 0.90)
                    )
            if groq_forensics.get("is_tampered"):
                authenticity_report["authenticity_score"] = min(authenticity_report.get("authenticity_score", 95.0), 38.0)
                authenticity_report["authenticity_risk"] = "HIGH"
                authenticity_report["decision_gateway"] = "REVIEW"
                authenticity_report["requires_human_review"] = True
                if "audit_flags" in authenticity_report:
                    authenticity_report["audit_flags"].append("Vision LLM detected digital manipulation/splicing in image")
                if "forensic_breakdown" in authenticity_report and "tampering_analysis" in authenticity_report["forensic_breakdown"]:
                    authenticity_report["forensic_breakdown"]["tampering_analysis"]["is_tampered"] = True

        if has_image and vision_data:
            evidence_summary = vision_data.get("evidence", "Photographic evidence verified.")
            log_step(
                agent="Evidence Agent",
                action="Analyze Visual Evidence",
                inp=f"Image filename: {image_filename or 'uploaded_file'}",
                out=f"Verified: {evidence_summary}"
            )
        else:
            evidence_summary = "Citizen verbal/textual statement recorded; no secondary photographic file supplied."
            log_step(
                agent="Evidence Agent",
                action="Verify Attached Evidence",
                inp="No image file provided",
                out="Citizen textual description recorded as primary grievance record."
            )

        # 4. Severity Assessment Agent
        sev_result = severity_agent.execute(
            issue_type=issue_type,
            text=combined_text,
            vision_result=vision_data
        )
        severity = sev_result["severity"]
        sev_reason = sev_result["reason"]

        log_step(
            agent="Severity Agent",
            action="Estimate Public Safety Severity",
            inp=f"Issue: {issue_type}, Markers: {sev_result.get('urgency_markers', [])}",
            out=f"Assessed as AI-estimated severity: {severity}. {sev_reason[:80]}..."
        )

        # 5. Department Mapping Agent with RAG
        dept_result = department_agent.execute(
            issue_type=issue_type,
            category=category,
            configured_departments=configured_departments
        )
        dept_name = dept_result["department_name"]
        if (dept_name == "General Civic Administration" or not dept_name) and vision_data.get("suggested_department"):
            dept_name = vision_data["suggested_department"]
        grounded_explanation = dept_result["grounded_explanation"]

        log_step(
            agent="Department Agent",
            action="Map Responsible Municipal Department",
            inp=f"Category: {category}, Issue: {issue_type}",
            out=f"Routed to '{dept_name}' based on {dept_result['rag_source']['doc_id']}."
        )

        # 6. Structured Complaint Generation
        generated_complaint = generator.generate_complaint_text(
            issue_type=issue_type,
            category=category,
            raw_text=combined_text or "Civic infrastructure issue reported.",
            location=loc_data,
            severity=severity,
            department_name=dept_name,
            evidence_summary=evidence_summary
        )

        log_step(
            agent="Complaint Generator",
            action="Synthesize Formal Grievance Notice",
            inp=f"Synthesizing {issue_type} + {dept_name} + {severity}",
            out="Structured municipal complaint draft generated for citizen review."
        )

        log_step(
            agent="Human-in-the-Loop Gateway",
            action="Await Citizen Confirmation",
            inp="Generated complaint draft presented on review screen",
            out="Complaint ready for final citizen verification and submission.",
            status="pending_citizen"
        )

        # Recommended Action for authorities
        recommended_actions = {
            "CRITICAL": "Immediate dispatch of emergency inspection team; deploy warning barricades within 2 hours.",
            "HIGH": "Assign ward engineer for on-site verification within 12 hours; schedule prompt repair.",
            "MEDIUM": "Add to weekly maintenance schedule; assign junior engineer within 24 hours.",
            "LOW": "Log into routine municipal works queue."
        }

        # Clear separation of AI prediction vs User Provided vs System Data
        return {
            "ai_predictions": {
                "issue_type": issue_type.lower(),
                "display_issue_type": issue_type.replace("_", " ").title(),
                "category": category,
                "severity": severity,
                "display_severity": f"AI-estimated severity: {severity}",
                "confidence": confidence,
                "department": dept_name,
                "department_code": dept_result.get("department_code"),
                "evidence_summary": evidence_summary,
                "severity_reason": sev_reason,
                "grounded_explanation": grounded_explanation,
                "rag_source": dept_result.get("rag_source"),
                "recommended_action": recommended_actions.get(severity, "Inspect site and take remedial action."),
                # Evidence Authenticity & Forensics Subsystem
                "evidence_authenticity": authenticity_report,
                "authenticity_score": authenticity_report.get("authenticity_score", 95.0),
                "authenticity_verdict": authenticity_report.get("decision_gateway", "PASS"),
                "authenticity_risk": authenticity_report.get("authenticity_risk", "LOW"),
                "authenticity_flags": authenticity_report.get("audit_flags", []),
                "requires_human_review": authenticity_report.get("requires_human_review", False)
            },
            "user_provided": {
                "raw_text": combined_text,
                "has_voice": bool(voice_transcription),
                "has_image": has_image,
                "image_filename": image_filename,
                "location": loc_data
            },
            "system_generated": {
                "generated_complaint_text": generated_complaint,
                "estimated_sla_hours": dept_result.get("default_sla_hours", 48),
                "decision_trace": trace,
                "decision_gateway": authenticity_report.get("decision_gateway", "PASS"),
                "requires_human_review": authenticity_report.get("requires_human_review", False),
                "gateway_rationale": authenticity_report.get("gateway_rationale", "Standard intake processing"),
                "mode": "DEMO_FALLBACK_ACTIVE" if not classification_agent.name.startswith("API") else "EXTERNAL_LLM"
            }
        }

civic_agent = CivicAgent()
