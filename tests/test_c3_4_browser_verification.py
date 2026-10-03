"""
Playwright Browser Verification for C3.4: Citizen Report Guidance & Regressions.
Tests live against http://localhost:5173/ with live backend at http://localhost:8000/.
"""

import sys
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

_ROOT_DIR = Path(__file__).resolve().parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.utils.security import create_access_token


def run_browser_verification():
    db = SessionLocal()
    citizen = db.query(User).filter(User.id == 1).first()
    assert citizen is not None, "Citizen 1 must exist"
    token = create_access_token(data={
        "user_id": citizen.id,
        "email": citizen.email,
        "role": citizen.role
    })
    user_data = {
        "id": citizen.id,
        "name": citizen.name or "Citizen User",
        "email": citizen.email,
        "role": citizen.role
    }
    db.close()

    print("\n=======================================================")
    print("STARTING C3.4 BROWSER VERIFICATION (Playwright)")
    print("=======================================================\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # 1. Setup authenticated session
        page.goto("http://localhost:5173/")
        page.evaluate(f"""() => {{
            localStorage.setItem('civicseva_token', '{token}');
            localStorage.setItem('civicseva_user', '{json.dumps(user_data)}');
        }}""")

        # 2. Navigate to ReportIssuePage
        print("[1/10] Navigating to http://localhost:5173/report...")
        page.goto("http://localhost:5173/report")
        page.wait_for_selector("h1:has-text('Report an Issue')", timeout=10000)
        print("  [OK] On Report Issue page.")

        # 3. Open Assistant Panel
        print("[2/10] Opening CivicSeva Assistant floating panel...")
        launcher_btn = page.locator("button[aria-label='Open CivicSeva Assistant']")
        launcher_btn.wait_for(state="visible", timeout=5000)
        launcher_btn.click()

        panel = page.locator("#civicseva-assistant-panel")
        panel.wait_for(state="visible", timeout=5000)
        print("  [OK] Assistant panel open.")

        def send_and_get_reply(msg_text: str):
            input_box = page.locator("input[aria-label='Type message for CivicSeva Assistant']")
            input_box.fill(msg_text)
            send_btn = page.locator("button[aria-label='Send question to Assistant']")
            send_btn.click()

            # Wait for thinking indicator to appear then disappear
            page.wait_for_timeout(400)
            page.wait_for_selector("span:has-text('Thinking...')", state="detached", timeout=15000)
            page.wait_for_timeout(400)

            # Get the latest assistant message
            bot_bubbles = page.locator("#civicseva-assistant-panel .bg-white.text-slate-800")
            count = bot_bubbles.count()
            latest_reply = bot_bubbles.nth(count - 1).inner_text()
            return latest_reply

        # -------------------------------------------------------------
        # TEST QUESTION 1: "What kind of photo is needed?"
        # -------------------------------------------------------------
        print("\n[3/10] Testing C3.4 Q1: 'What kind of photo is needed?'")
        q1_reply = send_and_get_reply("What kind of photo is needed?")
        print(f"  Reply snippet: {q1_reply[:120]}...")
        assert "JPG or PNG" in q1_reply or "10MB" in q1_reply, "Expected JPG/PNG format or size in photo guidance"
        assert "Report Issue page. Here is how it works:" not in q1_reply, "Must NOT fall back to generic page help"
        print("  [OK] C3.4 Photo Guidance verified!")

        # -------------------------------------------------------------
        # TEST QUESTION 2: "What types of civic issues can I report?"
        # -------------------------------------------------------------
        print("\n[4/10] Testing C3.4 Q2: 'What types of civic issues can I report?'")
        q2_reply = send_and_get_reply("What types of civic issues can I report?")
        print(f"  Reply snippet: {q2_reply[:120]}...")
        assert "Road Infrastructure" in q2_reply, "Expected Road Infrastructure in categories guidance"
        assert "Waste Management" in q2_reply, "Expected Waste Management in categories guidance"
        assert "Street Lighting" in q2_reply, "Expected Street Lighting in categories guidance"
        assert "Water Supply" in q2_reply, "Expected Water Supply in categories guidance"
        assert "Report Issue page. Here is how it works:" not in q2_reply, "Must NOT fall back to generic page help"
        print("  [OK] C3.4 Categories Guidance verified!")

        # -------------------------------------------------------------
        # TEST QUESTION 3: "Why is location important when reporting?"
        # -------------------------------------------------------------
        print("\n[5/10] Testing C3.4 Q3: 'Why is location important when reporting?'")
        q3_reply = send_and_get_reply("Why is location important when reporting?")
        print(f"  Reply snippet: {q3_reply[:120]}...")
        assert any(w in q3_reply.lower() for w in ["dispatch", "squad", "ward", "duplicate", "gps"]), "Expected location purpose"
        assert "Report Issue page. Here is how it works:" not in q3_reply, "Must NOT fall back to generic page help"
        print("  [OK] C3.4 Location Guidance verified!")

        # -------------------------------------------------------------
        # TEST QUESTION 4: "How does the AI analyze my photo?"
        # -------------------------------------------------------------
        print("\n[6/10] Testing C3.4 Q4: 'How does the AI analyze my photo?'")
        q4_reply = send_and_get_reply("How does the AI analyze my photo?")
        print(f"  Reply snippet: {q4_reply[:120]}...")
        assert any(w in q4_reply.lower() for w in ["photo", "category", "severity", "department", "review", "verification"]), "Expected AI analysis steps"
        assert "Report Issue page. Here is how it works:" not in q4_reply, "Must NOT fall back to generic page help"
        print("  [OK] C3.4 AI Analysis Guidance verified!")

        # Capture C3.4 screenshot
        screenshot_path = _ROOT_DIR / "tests" / "c3_4_browser_report_guidance.png"
        page.screenshot(path=str(screenshot_path))
        print(f"\n  [SCREENSHOT SAVED] {screenshot_path}")

        # -------------------------------------------------------------
        # REGRESSION 1: "What do I do here?" (C3.1 Page Help intact)
        # -------------------------------------------------------------
        print("\n[7/10] Regression C3.1: 'What do I do here?' on ReportIssuePage")
        reg_c31 = send_and_get_reply("What do I do here?")
        print(f"  Reply snippet: {reg_c31[:120]}...")
        assert "Report Issue page. Here is how it works:" in reg_c31, "C3.1 page help must remain intact"
        print("  [OK] C3.1 regression verified!")

        # -------------------------------------------------------------
        # REGRESSION 2: "I want to report a pothole" (C1 navigation)
        # -------------------------------------------------------------
        print("\n[8/10] Regression C1: 'I want to report a pothole'")
        reg_c1 = send_and_get_reply("I want to report a pothole")
        print(f"  Reply snippet: {reg_c1[:120]}...")
        assert "open the Report Issue page" in reg_c1.lower() or "report" in reg_c1.lower(), "C1 navigation must trigger"
        print("  [OK] C1 regression verified!")

        # -------------------------------------------------------------
        # REGRESSION 3: "Show my complaints" (C2 retrieval)
        # -------------------------------------------------------------
        print("\n[9/10] Regression C2: 'Show my complaints'")
        reg_c2 = send_and_get_reply("Show my complaints")
        print(f"  Reply snippet: {reg_c2[:120]}...")
        assert "CS1001" in reg_c2 or "complaints" in reg_c2.lower(), "C2 retrieval must return complaints"
        print("  [OK] C2 regression verified!")

        # -------------------------------------------------------------
        # REGRESSION 4: "Open complaint CS1001" (C4.1 navigation)
        # -------------------------------------------------------------
        print("\n[10/11] Regression C4.1: 'Open complaint CS1001'")
        reg_c41 = send_and_get_reply("Open complaint CS1001")
        print(f"  Reply snippet: {reg_c41[:120]}...")
        assert "opening complaint #cs1001" in reg_c41.lower() or "cs1001" in reg_c41.lower(), "C4.1 navigation must open CS1001"
        print("  [OK] C4.1 regression verified!")

        # Wait for navigation to /track/CS1001
        page.wait_for_timeout(1000)

        # -------------------------------------------------------------
        # REGRESSION 5: "Why is my complaint still in progress?" (C3.2 on TrackComplaintPage)
        # -------------------------------------------------------------
        print("\n[11/11] Regression C3.2: 'Why is my complaint still in progress?' on TrackComplaintPage")
        reg_c32 = send_and_get_reply("Why is my complaint still in progress?")
        print(f"  Reply snippet: {reg_c32[:120]}...")
        assert "In Progress" in reg_c32 or "progress" in reg_c32.lower(), "C3.2 explanation must handle progress inquiry"
        print("  [OK] C3.2 regression verified!")

        # Take final screenshot on TrackComplaintPage
        track_screenshot_path = _ROOT_DIR / "tests" / "c3_4_browser_track_regression.png"
        page.screenshot(path=str(track_screenshot_path))
        print(f"\n  [SCREENSHOT SAVED] {track_screenshot_path}")

        browser.close()

    print("\n=======================================================")
    print("ALL C3.4 BROWSER TESTS AND REGRESSIONS PASSED!")
    print("=======================================================\n")


if __name__ == "__main__":
    run_browser_verification()
