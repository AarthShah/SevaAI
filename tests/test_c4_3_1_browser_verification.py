"""
C4.3.1 Playwright Browser Verification
Tests C4.3.1 — Citizen Complaint Follow-Up in the live browser at http://localhost:5173.

Scenarios tested:
1. "Follow up on CS1001" -> Assistant requests confirmation, database NOT changed.
2. "Yes, proceed" -> Existing follow-up API executes, assistant reports actual backend result, database count increments by 1.
3. "Follow up on CS1001" -> Assistant requests confirmation, database NOT changed.
4. "No" -> Follow-up is cancelled, assistant confirms cancellation, database NOT changed.

Run with:
  python tests/test_c4_3_1_browser_verification.py
"""

import sys
import time
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database.session import SessionLocal
from backend.app.models.complaint import Complaint
from backend.app.models.complaint_history import ComplaintHistory
from backend.app.models.agent_action import AgentAction

ARTIFACT_DIR = Path("C:/Users/Shree/.gemini/antigravity-ide/brain/da9417a4-f88d-451b-a42f-0ab204cc3786")

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: playwright not installed.")
    sys.exit(1)

BASE_URL = "http://localhost:5173"
EMAIL = "citizen@civicseva.org"

results = []


def get_db_count(complaint_id="CS1001"):
    db = SessionLocal()
    try:
        c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        return c.follow_up_count if c else 0
    finally:
        db.close()


def cleanup_db(complaint_id="CS1001"):
    db = SessionLocal()
    try:
        c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if c:
            c.follow_up_count = 0
            c.updated_at = datetime(2026, 9, 27, 6, 17, 7, 264624)
        db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == complaint_id, ComplaintHistory.id > 3).delete()
        db.query(AgentAction).filter(AgentAction.complaint_id == complaint_id, AgentAction.action == "Follow-up Triggered").delete()
        db.commit()
    finally:
        db.close()


def screenshot(page, name):
    path = ARTIFACT_DIR / f"c4_3_1_{name}.png"
    page.screenshot(path=str(path))
    print(f"  Screenshot saved: {path}")
    return str(path)


def login(page):
    page.goto(f"{BASE_URL}/login")
    page.wait_for_selector("button:has-text('Citizen')", timeout=10000)
    page.locator("button:has-text('Citizen')").click()
    page.wait_for_timeout(1500)
    print(f"  Logged in as {EMAIL} (URL: {page.url})")


def open_assistant(page):
    """Click the floating assistant FAB button if not already open."""
    inp = page.locator("input[aria-label='Type message for CivicSeva Assistant']")
    if inp.count() > 0 and inp.first.is_visible():
        return
    fab = page.locator("button[aria-label='Open CivicSeva Assistant']")
    if fab.count() > 0 and fab.first.is_visible():
        fab.first.click()
    else:
        page.locator("button:has(svg.lucide-bot)").first.click()
    page.wait_for_selector("input[aria-label='Type message for CivicSeva Assistant']", timeout=5000)
    page.wait_for_timeout(500)


def send_message(page, msg):
    """Send a message in the assistant chat panel."""
    inp = page.locator("input[aria-label='Type message for CivicSeva Assistant']").first
    inp.fill(msg)
    page.locator("button[aria-label='Send question to Assistant']").first.click()
    page.wait_for_timeout(3500)


def get_last_reply(page):
    """Get the last assistant reply text."""
    try:
        bubbles = page.locator("div.bg-white.text-slate-800")
        if bubbles.count() > 0:
            return bubbles.last.inner_text().strip()
    except Exception:
        pass
    try:
        bubbles = page.locator(".flex.flex-col.items-start div.bg-white")
        if bubbles.count() > 0:
            return bubbles.last.inner_text().strip()
    except Exception:
        pass
    return "(could not read reply)"


def run_c4_3_1_browser_tests():
    print("\n" + "="*65)
    print("C4.3.1 — CITIZEN COMPLAINT FOLLOW-UP BROWSER VERIFICATION")
    print("="*65)

    cleanup_db("CS1001")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        try:
            login(page)
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_timeout(1500)
            open_assistant(page)

            # =================================================================
            # STEP 1: Follow up request -> confirmation request, NO mutation
            # =================================================================
            print("\n--- TEST SCENARIO 1: Follow up on CS1001 (Confirmation Request) ---")
            count_0 = get_db_count("CS1001")
            print(f"  DB follow_up_count before request: {count_0}")

            send_message(page, "Follow up on CS1001")
            reply_1 = get_last_reply(page)
            print(f"  Assistant reply: {reply_1}")

            count_1 = get_db_count("CS1001")
            print(f"  DB follow_up_count after request:  {count_1}")

            screenshot(page, "step1_confirmation_request")

            # Assertions for Step 1
            assert "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?" in reply_1, \
                f"Expected confirmation prompt, got: {reply_1}"
            assert count_1 == count_0, f"DB mutated prematurely! Before: {count_0}, After: {count_1}"
            print("  [PASS] Confirmation request appeared. DB count is UNCHANGED.")
            results.append(("step1_confirmation_request", "PASS", []))

            # =================================================================
            # STEP 2: "Yes, proceed" -> Execution, reporting, DB incremented
            # =================================================================
            print("\n--- TEST SCENARIO 2: 'Yes, proceed' (Execute Mutation) ---")
            send_message(page, "Yes, proceed")
            reply_2 = get_last_reply(page)
            print(f"  Assistant reply: {reply_2}")

            count_2 = get_db_count("CS1001")
            print(f"  DB follow_up_count after confirm:  {count_2}")

            screenshot(page, "step2_confirmed_executed")

            # Assertions for Step 2
            assert "submitted a follow-up inquiry for complaint #CS1001" in reply_2, \
                f"Expected execution confirmation, got: {reply_2}"
            assert count_2 == count_1 + 1, f"DB count did not increment! Before: {count_1}, After: {count_2}"
            print("  [PASS] Follow-up executed. DB count incremented by exactly 1.")
            results.append(("step2_confirmed_executed", "PASS", []))

            # =================================================================
            # STEP 3: Second follow-up request -> Confirmation request
            # =================================================================
            print("\n--- TEST SCENARIO 3: Second Follow up on CS1001 ---")
            count_3_before = get_db_count("CS1001")
            send_message(page, "Follow up on CS1001")
            reply_3 = get_last_reply(page)
            print(f"  Assistant reply: {reply_3}")

            count_3_after = get_db_count("CS1001")
            assert "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?" in reply_3
            assert count_3_after == count_3_before, "DB mutated prematurely!"
            print("  [PASS] Confirmation request appeared.")

            # =================================================================
            # STEP 4: "No" -> Cancellation, no mutation
            # =================================================================
            print("\n--- TEST SCENARIO 4: 'No' (Cancel Mutation) ---")
            send_message(page, "No")
            reply_4 = get_last_reply(page)
            print(f"  Assistant reply: {reply_4}")

            count_4 = get_db_count("CS1001")
            print(f"  DB follow_up_count after cancel:   {count_4}")

            screenshot(page, "step3_cancelled_no_mutation")

            # Assertions for Step 4
            assert "cancelled" in reply_4.lower() and "no changes were made" in reply_4.lower(), \
                f"Expected cancellation message, got: {reply_4}"
            assert count_4 == count_3_after, f"DB mutated upon cancellation! Before: {count_3_after}, After: {count_4}"
            print("  [PASS] Cancelled cleanly. DB count is UNCHANGED.")
            results.append(("step3_cancelled_no_mutation", "PASS", []))

        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback; traceback.print_exc()
            screenshot(page, "error")
            results.append(("browser_verification", "FAIL", [str(e)]))
        finally:
            browser.close()
            cleanup_db("CS1001")

    # Summary
    print("\n" + "="*65)
    print("C4.3.1 BROWSER VERIFICATION SUMMARY")
    print("="*65)
    all_pass = True
    for name, status, issues in results:
        mark = "[OK]" if status == "PASS" else "[X]"
        print(f"  {mark} {status:4} | {name}")
        for issue in issues:
            print(f"         - {issue}")
        if status != "PASS":
            all_pass = False

    print()
    if all_pass:
        print("ALL C4.3.1 BROWSER TESTS PASSED.")
    else:
        print("SOME C4.3.1 BROWSER TESTS FAILED.")
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    run_c4_3_1_browser_tests()
