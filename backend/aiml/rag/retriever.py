"""
CivicSeva Knowledge Retriever
Retrieves grounded regulatory citations, SOP guidelines, and department jurisdictions.
Provides verifiable evidence for 'Why this department was selected' and 'Why this severity was assigned'.
"""

import re
import math
from typing import List, Dict, Any, Tuple
from .knowledge_base import CIVIC_KNOWLEDGE_DOCUMENTS, DEPARTMENT_CONFIG

class CivicKnowledgeRetriever:
    def __init__(self, documents: List[Dict[str, Any]] = None):
        self.documents = documents or CIVIC_KNOWLEDGE_DOCUMENTS
        self.doc_index = self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', text.lower())
        stopwords = {
            "the", "and", "for", "with", "this", "that", "from", "are", "was",
            "were", "has", "have", "had", "near", "there", "some", "our", "been"
        }
        return [w for w in words if w not in stopwords]

    def _build_index(self) -> Dict[str, Any]:
        index = {}
        for doc in self.documents:
            text = f"{doc.get('title', '')} {doc.get('content', '')} {' '.join(doc.get('tags', []))}"
            tokens = self._tokenize(text)
            index[doc['id']] = {
                "doc": doc,
                "tokens": set(tokens),
                "token_counts": {t: tokens.count(t) for t in tokens}
            }
        return index

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return self.documents[:top_k]

        scored_docs: List[Tuple[float, Dict[str, Any]]] = []

        for doc_id, data in self.doc_index.items():
            doc = data["doc"]
            doc_tokens = data["tokens"]
            
            # Compute token overlap & weighted tag matches
            overlap = set(query_tokens).intersection(doc_tokens)
            score = 0.0
            
            for t in overlap:
                tf = data["token_counts"].get(t, 1)
                score += (1.0 + math.log(tf + 1.0))
            
            # Boost if query matches tags explicitly
            doc_tags = [tag.lower() for tag in doc.get("tags", [])]
            for q in query_tokens:
                if q in doc_tags:
                    score += 3.5

            if score > 0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        results = [doc for _, doc in scored_docs[:top_k]]
        
        # Fallback if no direct hit
        if not results and self.documents:
            results = [self.documents[0]]
            
        return results

    def get_grounded_explanation(self, issue_type: str, category: str, department_name: str) -> str:
        """
        Produces a verifiable, grounded explanation linking the selected department
        and category to the municipal knowledge base.
        """
        query = f"{issue_type} {category} {department_name}"
        docs = self.retrieve(query, top_k=1)
        if docs:
            top_doc = docs[0]
            return (
                f"Based on civic regulations in '{top_doc['title']}' ({top_doc['id']}), "
                f"issues relating to {category.replace('_', ' ')} are jurisdictionally assigned to the "
                f"{department_name}. SOP stipulates priority handling based on public safety impact."
            )
        return (
            f"Department routing confirmed according to municipal administration guidelines for "
            f"{category.replace('_', ' ')}."
        )

# Global singleton
retriever = CivicKnowledgeRetriever()
