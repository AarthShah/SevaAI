import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.local_yolo_fallback import LocalYoloFallbackDetector

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_local_yolo_fallback_detects_pothole_samples():
    detector = LocalYoloFallbackDetector()
    sample_path = REPO_ROOT / "frontend" / "public" / "sample_evidence" / "pothole.jpg"

    assert detector.is_available() is True
    result = detector.detect_file(str(sample_path), conf_threshold=0.25)

    assert result["detection_source"] == "local_yolo_fallback"
    assert result["detections"]
    assert any(det["label"] == "pothole" for det in result["detections"])


def test_local_yolo_fallback_detects_garbage_samples():
    detector = LocalYoloFallbackDetector()
    sample_path = REPO_ROOT / "frontend" / "public" / "sample_evidence" / "garbage.jpg"

    result = detector.detect_file(str(sample_path), conf_threshold=0.25)

    assert result["detection_source"] == "local_yolo_fallback"
    assert result["detections"]
    assert any(det["label"] in {"garbage", "trash_bag", "trash_pile"} for det in result["detections"])
