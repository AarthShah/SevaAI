"""
CivicSeva AI Evaluation Harness
Evaluates:
- Issue Classification Accuracy
- Precision, Recall, Macro-F1 across all civic categories
- Department Mapping Accuracy
- Severity Assessment Alignment
- Agent Workflow Completion Rate
- Evidence Grounding Verification
"""

import os
import json
from collections import defaultdict
from typing import Dict, Any, List

# When run as script, adjust path if needed
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from aiml.agents.civic_agent import civic_agent

DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.json")

class EvaluationHarness:
    def __init__(self, dataset_path: str = DATASET_PATH):
        self.dataset_path = dataset_path

    def load_dataset(self) -> List[Dict[str, Any]]:
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def run_evaluation(self) -> Dict[str, Any]:
        data = self.load_dataset()
        total = len(data)
        if total == 0:
            return {"error": "Empty dataset"}

        cls_correct = 0
        dept_correct = 0
        sev_correct = 0
        workflow_completed = 0
        evidence_grounded = 0

        # Confusion metrics for classification
        classes = ["POTHOLE", "GARBAGE", "STREETLIGHT", "WATER_LEAKAGE", "DRAINAGE", "ROAD_DAMAGE", "OTHER"]
        tp = defaultdict(int)
        fp = defaultdict(int)
        fn = defaultdict(int)

        case_results = []

        for item in data:
            case_id = item["id"]
            text = item["text"]
            exp_issue = item["expected_issue"].upper()
            exp_dept = item["expected_dept"]
            exp_sev = item["expected_severity"]

            # Run CivicSeva Multi-Agent Pipeline
            result = civic_agent.analyze_complaint(
                text=text,
                location={"address": "Benchmark Testing Location, Zone 4", "latitude": 18.5204, "longitude": 73.8567}
            )

            pred = result["ai_predictions"]
            sys_gen = result["system_generated"]

            pred_issue = pred["issue_type"].upper()
            pred_dept = pred["department"]
            pred_sev = pred["severity"]

            is_cls_match = (pred_issue == exp_issue)
            is_dept_match = (pred_dept.lower() in exp_dept.lower() or exp_dept.lower() in pred_dept.lower())
            is_sev_match = (pred_sev == exp_sev)

            if is_cls_match:
                cls_correct += 1
                tp[exp_issue] += 1
            else:
                fp[pred_issue] += 1
                fn[exp_issue] += 1

            if is_dept_match:
                dept_correct += 1
            if is_sev_match:
                sev_correct += 1

            # Workflow completion: did all 6 steps execute cleanly?
            trace = sys_gen.get("decision_trace", [])
            if len(trace) >= 6:
                workflow_completed += 1

            # Grounding check: does grounded explanation cite a valid KB ID?
            if "KB_" in pred.get("grounded_explanation", "") or pred.get("rag_source"):
                evidence_grounded += 1

            case_results.append({
                "id": case_id,
                "text": text,
                "expected": {"issue": exp_issue, "department": exp_dept, "severity": exp_sev},
                "predicted": {"issue": pred_issue, "department": pred_dept, "severity": pred_sev},
                "matches": {
                    "issue": is_cls_match,
                    "department": is_dept_match,
                    "severity": is_sev_match
                }
            })

        # Calculate Precision, Recall, F1
        per_class_metrics = {}
        f1_sum = 0.0
        active_classes = 0

        for c in classes:
            c_tp = tp[c]
            c_fp = fp[c]
            c_fn = fn[c]

            precision = c_tp / (c_tp + c_fp) if (c_tp + c_fp) > 0 else 1.0
            recall = c_tp / (c_tp + c_fn) if (c_tp + c_fn) > 0 else 1.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            if (c_tp + c_fn) > 0:
                f1_sum += f1
                active_classes += 1

            per_class_metrics[c] = {
                "precision": round(precision, 3),
                "recall": round(recall, 3),
                "f1_score": round(f1, 3),
                "support": c_tp + c_fn
            }

        macro_f1 = f1_sum / active_classes if active_classes > 0 else 0.0

        summary = {
            "evaluation_title": "CivicSeva Agentic Benchmark Evaluation",
            "model_tested": "CivicSeva Autonomous Multi-Agent Pipeline (v1.0-Hackathon)",
            "sample_size": total,
            "overall_metrics": {
                "classification_accuracy": round((cls_correct / total) * 100, 1),
                "department_mapping_accuracy": round((dept_correct / total) * 100, 1),
                "severity_calibration_accuracy": round((sev_correct / total) * 100, 1),
                "agent_workflow_completion_rate": round((workflow_completed / total) * 100, 1),
                "evidence_grounding_rate": round((evidence_grounded / total) * 100, 1),
                "macro_f1_score": round(macro_f1, 3)
            },
            "per_class_metrics": per_class_metrics,
            "cases": case_results
        }
        return summary

if __name__ == "__main__":
    harness = EvaluationHarness()
    results = harness.run_evaluation()
    print("=" * 60)
    print("          CIVICSEVA AGENT EVALUATION REPORT")
    print("=" * 60)
    m = results["overall_metrics"]
    print(f"Dataset Test Cases:            {results['sample_size']}")
    print(f"Classification Accuracy:       {m['classification_accuracy']}%")
    print(f"Department Routing Accuracy:   {m['department_mapping_accuracy']}%")
    print(f"Severity Calibration:          {m['severity_calibration_accuracy']}%")
    print(f"Workflow Completion Rate:      {m['agent_workflow_completion_rate']}%")
    print(f"Evidence Grounding Rate:       {m['evidence_grounding_rate']}%")
    print(f"Macro F1-Score:                {m['macro_f1_score']}")
    print("-" * 60)
    print("PER-CLASS METRICS:")
    for cls_name, cm in results["per_class_metrics"].items():
        print(f"  {cls_name:15}: P={cm['precision']:.3f} | R={cm['recall']:.3f} | F1={cm['f1_score']:.3f} (n={cm['support']})")
    print("=" * 60)
