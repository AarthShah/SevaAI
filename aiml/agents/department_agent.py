"""
CivicSeva Department Mapping Agent
Maps classified civic grievances to the responsible municipal department,
grounded by RAG knowledge base bylaws and configurable municipal routing.
"""

from typing import Dict, Any, Optional
from ..rag.knowledge_base import DEPARTMENT_CONFIG
from ..rag.retriever import retriever

class DepartmentAgent:
    def __init__(self):
        self.name = "DepartmentAgent"

    def execute(
        self,
        issue_type: str,
        category: str,
        configured_departments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resolves the responsible municipal department and retrieves grounded RAG justification.
        """
        dept_config = configured_departments or DEPARTMENT_CONFIG

        # Map category to department
        dept_info = dept_config.get(category)
        if not dept_info:
            # Fallback to general admin
            dept_info = dept_config.get("public_safety_other", {
                "name": "General Civic Administration",
                "code": "DEPT_GEN_ADMIN",
                "contact_email": "support@civicseva.org",
                "default_sla_hours": 72
            })

        dept_name = dept_info.get("name", "Municipal Public Works Department")
        dept_code = dept_info.get("code", "DEPT_GEN")
        sla_hours = dept_info.get("default_sla_hours", 48)

        # Grounding with RAG
        grounded_explanation = retriever.get_grounded_explanation(
            issue_type=issue_type,
            category=category,
            department_name=dept_name
        )

        relevant_docs = retriever.retrieve(f"{issue_type} {category}", top_k=1)
        source_doc_id = relevant_docs[0]["id"] if relevant_docs else "KB_GENERAL"
        source_title = relevant_docs[0]["title"] if relevant_docs else "Standard Municipal By-laws"

        return {
            "agent": self.name,
            "department_name": dept_name,
            "department_code": dept_code,
            "contact_email": dept_info.get("contact_email"),
            "contact_phone": dept_info.get("contact_phone"),
            "office_location": dept_info.get("office_location"),
            "default_sla_hours": sla_hours,
            "grounded_explanation": grounded_explanation,
            "rag_source": {
                "doc_id": source_doc_id,
                "doc_title": source_title
            },
            "confidence": 0.95
        }

department_agent = DepartmentAgent()
