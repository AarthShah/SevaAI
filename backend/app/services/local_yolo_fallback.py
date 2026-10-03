import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import cv2
except Exception:  # pragma: no cover
    cv2 = None


def _ensure_local_venv_on_path() -> None:
    """Use the dedicated CCTV venv only as a last-resort fallback.

    The workspace interpreter already has a working Ultralytics installation in many
    setups; the local CCTV venv may be incomplete or broken, so it must not shadow
    the active environment.
    """
    try:
        import ultralytics  # noqa: F401
        return
    except Exception:
        pass

    env_root = Path(os.getenv("CCTV_AI_ROOT", r"C:/civic_cctv_ai")).expanduser()
    for venv_dir in (env_root / ".venv", env_root / "venv"):
        if not venv_dir.exists():
            continue

        site_candidates = []
        if os.name == "nt":
            site_candidates.append(venv_dir / "Lib" / "site-packages")
        else:
            site_candidates.extend(sorted(venv_dir.glob("lib/python*/site-packages")))

        for candidate in site_candidates:
            if candidate.exists() and str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))


_ensure_local_venv_on_path()

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None


class LocalYoloFallbackDetector:
    """Load the verified local CivicSeva YOLO checkpoints and use them only as fallback.

    The audited checkpoints in C:/civic_cctv_ai are:
    - YOLO11s pothole model with class {0: 'pothole'}
    - trash segmentation model with class names {'trash_bag', 'trash_pile'}

    The fallback intentionally restricts predictions to pothole and garbage only so
    unsupported civic classes are never invented from the local model.
    """

    def __init__(self, cctv_ai_root: Optional[str] = None):
        self.cctv_ai_root = Path(cctv_ai_root or os.getenv("CCTV_AI_ROOT", r"C:/civic_cctv_ai")).expanduser()
        self.pothole_model_path = self._resolve_model(
            [
                self.cctv_ai_root / "runs" / "train" / "yolo11s_pothole_v2" / "weights" / "best.pt",
                self.cctv_ai_root / "runs" / "train" / "yolo11s_pothole_v2" / "weights" / "last.pt",
            ]
        )
        self.garbage_model_path = self._resolve_model(
            [
                self.cctv_ai_root / "weights" / "test_trash" / "trash_best.pt",
                self.cctv_ai_root / "weights" / "trash" / "trash_best.pt",
            ]
        )
        self._models: Dict[str, Any] = {}

    @staticmethod
    def _resolve_model(paths: List[Path]) -> Optional[Path]:
        for path in paths:
            if path.exists():
                return path
        return None

    def is_available(self) -> bool:
        has_model = self.pothole_model_path is not None or self.garbage_model_path is not None
        return YOLO is not None and has_model

    def _load_model(self, key: str, path: Optional[Path]) -> Any:
        if path is None:
            raise FileNotFoundError(f"Local YOLO model not found for {key} fallback")
        if YOLO is None:
            raise RuntimeError("ultralytics is not installed; local YOLO fallback is unavailable")
        if key not in self._models:
            self._models[key] = YOLO(str(path))
        return self._models[key]

    @staticmethod
    def _normalize_label(class_name: str) -> str:
        name = (class_name or "").strip().lower().replace("_", " ")
        if "pothole" in name:
            return "pothole"
        if any(token in name for token in ["garbage", "trash bag", "trash pile", "trash"]):
            return "garbage"
        return "unknown"

    def _extract_detections_for_model(self, model: Any, source: str, image_path: str, conf_threshold: float) -> List[Dict[str, Any]]:
        results = model(image_path, conf=conf_threshold, device="cpu", verbose=False)
        box_results = results[0] if results else None
        if box_results is None or getattr(box_results, "boxes", None) is None:
            return []

        detections: List[Dict[str, Any]] = []
        boxes = box_results.boxes
        names = getattr(model, "names", {}) or {}
        for idx in range(len(boxes)):
            item = boxes[idx]
            cls_id = int(item.cls.item())
            class_name = names.get(cls_id, getattr(item, "name", "unknown"))
            label = self._normalize_label(str(class_name))
            if label == "unknown":
                continue

            conf = float(item.conf.item()) if hasattr(item, "conf") and item.conf is not None else 0.0
            xyxy = item.xyxy[0].tolist() if hasattr(item, "xyxy") and item.xyxy is not None else [0, 0, 0, 0]
            detections.append(
                {
                    "label": label,
                    "class_name": class_name,
                    "class_id": cls_id,
                    "confidence": round(conf, 3),
                    "bbox": [round(float(v), 2) for v in xyxy],
                    "source": source,
                    "model": "local_yolo_fallback",
                }
            )
        return detections

    def detect_file(self, file_path: str, conf_threshold: float = 0.25, device: str = "cpu") -> Dict[str, Any]:
        """Run local YOLO fallback on a single image or video path."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Local YOLO fallback input not found: {file_path}")

        if path.suffix.lower() in {".mp4", ".avi", ".mov", ".mkv"}:
            return self.detect_video(str(path), conf_threshold=conf_threshold, device=device)

        detections: List[Dict[str, Any]] = []
        if self.pothole_model_path is not None:
            pothole_model = self._load_model("pothole", self.pothole_model_path)
            detections.extend(self._extract_detections_for_model(pothole_model, "local_yolo_fallback", str(path), conf_threshold))

        if self.garbage_model_path is not None:
            garbage_model = self._load_model("garbage", self.garbage_model_path)
            garbage_detections = self._extract_detections_for_model(garbage_model, "local_yolo_fallback", str(path), conf_threshold)
            for det in garbage_detections:
                if det["label"] == "garbage":
                    detections.append(det)

        detections = self._deduplicate(detections)
        primary_issue = self._primary_issue(detections)
        result = {
            "status": "success" if detections else "no_defects_detected",
            "detection_source": "local_yolo_fallback",
            "fallback_used": True,
            "primary_issue": primary_issue,
            "detections": detections,
            "issue_count": len(detections),
            "confidence": max((d["confidence"] for d in detections), default=0.0),
        }
        return result

    def detect_video(self, video_path: str, conf_threshold: float = 0.25, device: str = "cpu") -> Dict[str, Any]:
        if cv2 is None:
            raise RuntimeError("OpenCV is required for local YOLO video fallback")

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video for local YOLO fallback: {video_path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_index = 0
        frames: List[Dict[str, Any]] = []
        all_detections: List[Dict[str, Any]] = []

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_path = f"{video_path}_frame_{frame_index}.png"
            cv2.imwrite(frame_path, frame)
            try:
                frame_result = self.detect_file(frame_path, conf_threshold=conf_threshold, device=device)
            finally:
                if os.path.exists(frame_path):
                    os.remove(frame_path)

            frame_detections = frame_result.get("detections", [])
            if frame_detections:
                for det in frame_detections:
                    det["frame_index"] = frame_index
                    det["timestamp"] = round(frame_index / fps, 3) if fps else 0.0
                    all_detections.append(det)
            frames.append({
                "frame_idx": frame_index,
                "timestamp": round(frame_index / fps, 3) if fps else 0.0,
                "detections": frame_detections,
            })
            frame_index += 1

        cap.release()
        primary_issue = self._primary_issue(all_detections)
        return {
            "status": "success" if all_detections else "no_defects_detected",
            "detection_source": "local_yolo_fallback",
            "fallback_used": True,
            "primary_issue": primary_issue,
            "detections": self._deduplicate(all_detections),
            "frames": frames,
            "metadata": {
                "fps": fps,
                "width": width,
                "height": height,
                "source_model": "local_yolo_fallback",
            },
            "issue_count": len(all_detections),
            "confidence": max((d["confidence"] for d in all_detections), default=0.0),
        }

    @staticmethod
    def _deduplicate(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        unique: List[Dict[str, Any]] = []
        seen = set()
        for det in detections:
            key = (
                det.get("label"),
                tuple(round(float(v), 2) for v in det.get("bbox", [0, 0, 0, 0])),
                round(float(det.get("confidence", 0.0)), 3),
            )
            if key in seen:
                continue
            seen.add(key)
            unique.append(det)
        return unique

    @staticmethod
    def _primary_issue(detections: List[Dict[str, Any]]) -> Optional[str]:
        labels = [d.get("label") for d in detections if d.get("label")]
        if "pothole" in labels:
            return "pothole"
        if "garbage" in labels:
            return "garbage"
        return None


local_yolo_fallback = LocalYoloFallbackDetector()
