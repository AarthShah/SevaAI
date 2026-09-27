"""
CivicSeva Contextual Assistant - API Router

Exposes:
  POST /api/assistant/chat

Features:
- Accepts AssistantChatRequest with message, page_context, form_context, selected_complaint_id, and history.
- Resolves authenticated user via get_optional_user() dependency without requiring auth (supports public users).
- Delegates orchestration entirely to AssistantService.chat().
- Returns AssistantChatResponse with safe reply, quick actions, context version, and optional error code.
- Read-only: Never mutates complaint or database state.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..middleware.auth_middleware import get_optional_user
from ..models.user import User
from ..schemas.assistant import AssistantChatRequest, AssistantChatResponse
from ..services.assistant_service import AssistantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["CivicSeva Assistant"])


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    request: AssistantChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> AssistantChatResponse:
    """
    Contextual AI Assistant chat endpoint for CivicSeva.
    
    Provides role-gated, read-only guidance for citizens, authorities, and public visitors.
    Accepts client-side UI context (page, form, history) but always resolves
    permissions and authoritative complaint state from the backend.
    """
    logger.info(
        "Assistant chat request: user_id=%s, role=%s, selected_complaint=%s",
        getattr(current_user, "id", None),
        getattr(current_user, "role", "public"),
        request.selected_complaint_id,
    )

    response = AssistantService.chat(
        request=request,
        current_user=current_user,
        db=db,
    )
    return response
