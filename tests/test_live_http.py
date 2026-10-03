import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import urllib.request
from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.utils.security import create_access_token

db = SessionLocal()
citizen = db.query(User).filter(User.email == "citizen@civicseva.org").first()
db.close()

token = create_access_token(data={"user_id": citizen.id, "email": citizen.email, "role": citizen.role})

def post_chat(msg, auth=True, page_context=None, selected_complaint_id=None, conversation_history=None):
    url = "http://127.0.0.1:8000/api/assistant/chat"
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = f"Bearer {token}"
    body = {"message": msg}
    if page_context:
        body["page_context"] = page_context
    if selected_complaint_id:
        body["selected_complaint_id"] = selected_complaint_id
    if conversation_history:
        body["conversation_history"] = conversation_history
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

track_cs1001_ctx = {
    "route": "/track/CS1001",
    "page_name": "TrackComplaintPage",
    "selected_complaint_id": "CS1001"
}

track_cs9002_ctx = {
    "route": "/track/CS9002",
    "page_name": "TrackComplaintPage",
    "selected_complaint_id": "CS9002"
}

test_queries = [
    # C2 Retrieval
    ("Show my complaints", True, None, None),
    ("What is my latest complaint?", True, None, None),
    ("Track complaint CS1001", True, None, None),
    ("Track complaint CS9002", True, None, None),

    # C1 Navigation
    ("I want to file a complaint", True, None, None),
    ("How do I report a pothole?", True, None, None),

    # C3.1 Page Awareness
    ("What do I do here?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("What can I do on this page?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("What do I do here?", True, track_cs1001_ctx, "CS1001"),
    ("What do I do here?", True, {"page_name": "TrackComplaintPage", "route": "/track"}, None),
    ("What do I do here?", True, {"page_name": "CitizenDashboard", "route": "/dashboard"}, None),
    ("What is this website?", True, {"page_name": "LandingPage", "route": "/"}, None),

    # C3.2 Contextual Complaint Explanation
    ("What happened to my complaint?", True, track_cs1001_ctx, "CS1001"),
    ("What does this status mean?", True, track_cs1001_ctx, "CS1001"),
    ("Explain the timeline.", True, track_cs1001_ctx, "CS1001"),
    ("Why is my complaint still in progress?", True, track_cs1001_ctx, "CS1001"),
    ("Which department is handling it?", True, track_cs1001_ctx, "CS1001"),
    ("When was my complaint submitted?", True, track_cs1001_ctx, "CS1001"),
    ("When was it assigned?", True, track_cs1001_ctx, "CS1001"),
    ("Why was my complaint escalated?", True, track_cs1001_ctx, "CS1001"),

    # C3.2 Foreign / Invalid / Public Security
    ("What happened to my complaint?", True, track_cs9002_ctx, "CS9002"),
    ("What happened to complaint CS9999?", True, track_cs1001_ctx, None),
    ("What happened to my complaint?", False, track_cs1001_ctx, "CS1001"),

    # C3.3 Proactive Contextual Assistance
    ("What should I know?", True, track_cs1001_ctx, "CS1001"),
    ("__proactive__", True, track_cs1001_ctx, "CS1001"),
    ("What should I know?", True, {"page_name": "CitizenDashboard", "route": "/dashboard"}, None),
    ("__proactive__", True, {"page_name": "CitizenDashboard", "route": "/dashboard"}, None),
    ("Any updates?", True, track_cs1001_ctx, "CS1001"),
    ("Where do things stand?", True, track_cs1001_ctx, "CS1001"),
    ("What should I know?", True, {"page_name": "LandingPage", "route": "/"}, None),
    ("What should I know?", True, track_cs9002_ctx, "CS9002"),
    ("What should I know?", False, track_cs1001_ctx, "CS1001"),

    # C4.1 Citizen Convenience Navigation
    ("Open the Report Issue page", True, None, None),
    ("Take me to the dashboard", True, None, None),
    ("Open my complaints", True, None, None),
    ("Take me to Track Complaint", True, None, None),
    ("Open my latest complaint", True, None, None),
    ("Open complaint CS1001", True, None, None),
    ("Open complaint CS9002", True, None, None),
    ("Open complaint CS9999", True, None, None),
    ("Open complaint CS1001", False, None, None),
    ("Open my latest complaint", False, None, None),
    ("Take me to the dashboard", False, None, None),
    ("Open the Report Issue page", False, None, None),

    # C3.4 Citizen Report Guidance
    ("What kind of photo is needed?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("What types of civic issues can I report?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("Why is location important when reporting?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("How does the AI analyze my photo?", True, {"page_name": "ReportIssuePage", "route": "/report"}, None),
    ("What kind of photo is needed?", False, None, None),
    ("What types of civic issues can I report?", False, None, None),

    # C4.2 Complaint-Focused Convenience
    ("Open my escalated complaint", True, None, None),
    ("Open my complaint that's in progress", True, None, None),
    ("Take me to my resolved complaint", True, None, None),
    ("Show me my pothole complaint", True, None, None),
    ("Open my drainage complaint", True, None, None),
    ("Open my garbage complaint", True, None, None),
    ("Take me to my streetlight complaint", True, None, None, None),
    ("Open my safety complaint", True, None, None, None),
    ("Open my escalated complaint", False, None, None, None),

    # C4.3.1 Citizen Complaint Follow-Up
    ("Follow up on CS1001", True, None, None, None),
    ("Submit a follow-up for my latest complaint", True, None, None, None),
    ("Follow up on CS9002", True, None, None, None),
    ("Follow up on CS9999", True, None, None, None),
    ("Follow up on CS1001", False, None, None, None),
    ("No", True, None, None, [
        {"role": "user", "content": "Follow up on CS1001"},
        {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
    ]),
    ("Yes, proceed", True, None, None, [
        {"role": "user", "content": "Follow up on CS1001"},
        {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
    ]),
]

print("=== LIVE HTTP TEST RESULTS ===")
for item in test_queries:
    q = item[0]
    auth = item[1]
    p_ctx = item[2]
    sel_id = item[3]
    hist = item[4] if len(item) > 4 else None
    res = post_chat(q, auth, p_ctx, sel_id, conversation_history=hist)
    mode = "AUTH" if auth else "PUBLIC"
    act = res.get("action")
    rep = res.get("reply", "").replace("\n", " ")[:65]
    p_name = p_ctx.get("page_name") if p_ctx else "None"
    print(f"[{mode:6}|{p_name:18}] {q:42} | Act: {str(act):17} | {rep}...")

# Cleanup after live tests so CS1001 stays in seed state
from datetime import datetime
from backend.app.models.complaint import Complaint
from backend.app.models.complaint_history import ComplaintHistory
from backend.app.models.agent_action import AgentAction
db = SessionLocal()
c = db.query(Complaint).filter(Complaint.id == "CS1001").first()
if c:
    c.follow_up_count = 0
    c.updated_at = datetime(2026, 9, 27, 6, 17, 7, 264624)
db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == "CS1001", ComplaintHistory.id > 3).delete()
db.query(AgentAction).filter(AgentAction.complaint_id == "CS1001", AgentAction.action == "Follow-up Triggered").delete()
db.commit()
db.close()

print("\nALL LIVE HTTP TESTS COMPLETED SUCCESSFULLY!")
