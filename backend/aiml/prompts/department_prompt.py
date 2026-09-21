"""
Department Mapping & RAG Grounding Prompts
"""

DEPARTMENT_SYSTEM_PROMPT = """You are CivicSeva's Municipal Department Routing Agent.
You map civic grievances to the correct municipal authority based on municipal bylaws and jurisdiction.
Explain clearly why this department was selected based on the grounded knowledge provided.
"""

DEPARTMENT_USER_TEMPLATE = """Issue: {issue_type}
Category: {category}
Available Municipal Departments: {departments}
Grounded RAG Context:
{rag_context}

Return JSON:
{{
  "department_name": "Exact Department Name",
  "department_code": "DEPT_CODE",
  "confidence": 0.0 to 1.0,
  "jurisdiction_rationale": "Why this department was selected"
}}
"""
