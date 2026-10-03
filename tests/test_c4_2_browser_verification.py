"""
C4.2 Playwright Browser Verification
Tests C4.2 — Complaint-Focused Convenience Navigation in the live browser at http://localhost:5173.

Run with:
  python tests/test_c4_2_browser_verification.py
"""

import sys
import time
from pathlib import Path

ARTIFACT_DIR = Path("C:/Users/Shree/.gemini/antigravity-ide/brain/da9417a4-f88d-451b-a42f-0ab204cc3786")

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("ERROR: playwright not installed.")
    sys.exit(1)

BASE_URL = "http://localhost:5173"
EMAIL = "citizen@civicseva.org"
PASSWORD = "citizen123"

results = []


def screenshot(page, name):
    path = ARTIFACT_DIR / f"c4_2_{name}.png"
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


def run_test(name, setup_url, message, expected_url_contains=None, expected_in_reply=None, expect_no_nav=False):
    print(f"\n{'='*65}")
    print(f"TEST: {name}")
    print(f"{'='*65}")
    passed = True
    issues = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        try:
            login(page)

            if setup_url:
                page.goto(f"{BASE_URL}{setup_url}")
                page.wait_for_timeout(1500)

            initial_url = page.url
            open_assistant(page)
            send_message(page, message)
            final_url = page.url
            reply = get_last_reply(page)

            print(f"  Message:       {message}")
            print(f"  Reply:         {reply[:180]}")
            print(f"  Initial URL:   {initial_url}")
            print(f"  Final URL:     {final_url}")

            screenshot(page, name)

            if expected_url_contains:
                if expected_url_contains in final_url:
                    print(f"  NAV CHECK:     PASS — navigated to '{final_url}'")
                else:
                    msg = f"Expected URL to contain '{expected_url_contains}', got '{final_url}'"
                    print(f"  NAV CHECK:     FAIL — {msg}")
                    passed = False
                    issues.append(msg)

            if expect_no_nav:
                if final_url.rstrip("/") == initial_url.rstrip("/"):
                    print(f"  NO-NAV CHECK:  PASS — stayed at '{final_url}'")
                else:
                    msg = f"Should not navigate, but moved from '{initial_url}' → '{final_url}'"
                    print(f"  NO-NAV CHECK:  FAIL — {msg}")
                    passed = False
                    issues.append(msg)

            if expected_in_reply:
                for phrase in expected_in_reply:
                    if phrase.lower() in reply.lower():
                        print(f"  REPLY CHECK:   PASS — found '{phrase}'")
                    else:
                        msg = f"Expected '{phrase}' in reply — not found"
                        print(f"  REPLY CHECK:   FAIL — {msg}")
                        passed = False
                        issues.append(msg)

        except Exception as e:
            print(f"  ERROR:         {e}")
            import traceback; traceback.print_exc()
            try:
                screenshot(page, f"{name}_error")
            except Exception:
                pass
            passed = False
            issues.append(str(e))
        finally:
            browser.close()

    status = "PASS" if passed else "FAIL"
    print(f"\n  RESULT: {status}")
    for issue in issues:
        print(f"    - {issue}")
    results.append((name, status, issues))
    return passed


if __name__ == "__main__":
    print("\n" + "="*65)
    print("C4.2 — COMPLAINT-FOCUSED CONVENIENCE BROWSER VERIFICATION")
    print("="*65)

    # Test 1: Multiple escalated complaints → disambiguation list, NO navigation
    run_test(
        name="test1_escalated_multi_match",
        setup_url="/dashboard",
        message="Open my escalated complaint",
        expect_no_nav=True,
        expected_in_reply=["Escalated", "CS1099", "CS1004", "Which one"]
    )

    # Test 2: Single in-progress complaint → navigates to /track/CS1001
    run_test(
        name="test2_in_progress_single_match",
        setup_url="/dashboard",
        message="Open my complaint that's in progress",
        expected_url_contains="/track/CS1001",
        expected_in_reply=["CS1001"]
    )

    # Test 3: Pothole category → navigates to /track/CS1001
    run_test(
        name="test3_pothole_category",
        setup_url="/dashboard",
        message="Show me my pothole complaint",
        expected_url_contains="/track/CS1001",
        expected_in_reply=["CS1001"]
    )

    # Test 4: Drainage category → navigates to /track/CS1005
    run_test(
        name="test4_drainage_category",
        setup_url="/dashboard",
        message="Open my drainage complaint",
        expected_url_contains="/track/CS1005",
        expected_in_reply=["CS1005"]
    )

    # ── SUMMARY ──────────────────────────────────────────────────────────────
    print("\n" + "="*65)
    print("C4.2 BROWSER VERIFICATION SUMMARY")
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
        print("ALL C4.2 BROWSER TESTS PASSED.")
    else:
        print("SOME C4.2 BROWSER TESTS FAILED — check screenshots in artifact dir.")
    sys.exit(0 if all_pass else 1)
