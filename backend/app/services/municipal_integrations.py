"""Optional outbound delivery for escalation events to municipal systems."""

import logging
from typing import Any, Dict

import requests

from ..config import ESCALATION_WEBHOOK_TOKEN, ESCALATION_WEBHOOK_URL

logger = logging.getLogger(__name__)


def deliver_escalation(payload: Dict[str, Any]) -> bool:
    """Send an escalation to a configured municipal webhook; never fake delivery."""
    if not ESCALATION_WEBHOOK_URL:
        logger.warning("Escalation recorded locally; ESCALATION_WEBHOOK_URL is not configured.")
        return False

    headers = {"Content-Type": "application/json"}
    if ESCALATION_WEBHOOK_TOKEN:
        headers["Authorization"] = f"Bearer {ESCALATION_WEBHOOK_TOKEN}"
    try:
        response = requests.post(ESCALATION_WEBHOOK_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception("Municipal escalation webhook delivery failed.")
        return False
