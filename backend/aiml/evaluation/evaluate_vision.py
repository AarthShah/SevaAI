"""Run the saved civic-image classification examples through the configured vision model."""

import argparse
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from aiml.vision.issue_detector import HAS_GROQ, detector  # noqa: E402


DATASET_PATH = Path(__file__).with_name("vision_dataset.json")


def run(require_llm: bool = True, limit: int | None = None, case_ids: list[str] | None = None, pace_seconds: float = 0) -> int:
    cases = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    if case_ids:
        by_id = {case["id"]: case for case in cases}
        missing = [case_id for case_id in case_ids if case_id not in by_id]
        if missing:
            print(f"Unknown vision case ID(s): {', '.join(missing)}", flush=True)
            return 2
        cases = [by_id[case_id] for case_id in case_ids]
    if limit:
        cases = cases[:limit]
    if require_llm and (not HAS_GROQ or not detector.api_key):
        print("LLM vision evaluation unavailable: install groq and configure GROQ_API_KEY or VISION_API_KEY.")
        return 2

    passed = 0
    for index, case in enumerate(cases):
        if index and pace_seconds > 0:
            time.sleep(pace_seconds)
        image_path = REPO_ROOT / case["image"]
        if not image_path.is_file():
            print(f"FAIL {case['id']}: missing image file {case['image']}", flush=True)
            continue

        result = detector.analyze_image(str(image_path), filename=image_path.name)
        mode = result.get("mode", "unknown")
        predicted = str(result.get("detected_issue", "unknown")).lower()
        category = str(result.get("category", "unknown")).lower()
        department = str(result.get("suggested_department", "unknown")).lower()
        llm_used = mode == "GROQ_QWEN_VISION" and bool(result.get("visual_features", {}).get("llm_verified"))
        issue_matches = predicted == case["expected_issue"] or predicted in case.get("accepted_issues", [])
        category_matches = category in case["accepted_categories"]
        department_matches = any(label in department for label in case.get("accepted_departments", []))
        ok = issue_matches and category_matches and department_matches and (llm_used or not require_llm)
        passed += int(ok)
        status = "PASS" if ok else "FAIL"
        print(f"{status} {case['id']}: expected={case['expected_issue']}/{case['accepted_categories']} "
              f"predicted={predicted}/{category}/{department} confidence={result.get('confidence')} mode={mode}", flush=True)

    print(f"Vision image cases: {passed}/{len(cases)} passed ({'LLM required' if require_llm else 'fallback allowed'}).", flush=True)
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-local-fallback", action="store_true", help="Allow safe unclassified local fallback results; LLM mode is not required.")
    parser.add_argument("--limit", type=int, help="Evaluate only the first N examples (useful for a quick model smoke test).")
    parser.add_argument("--case", dest="case_ids", action="append", help="Evaluate a selected case ID; may be repeated.")
    parser.add_argument("--pace-seconds", type=float, default=30, help="Wait between model calls to respect provider limits (default: 30 seconds).")
    args = parser.parse_args()
    raise SystemExit(run(require_llm=not args.allow_local_fallback, limit=args.limit, case_ids=args.case_ids, pace_seconds=args.pace_seconds))
