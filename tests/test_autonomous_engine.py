"""
CivicSeva Autonomous Engine E2E Test Suite
Verifies:
1. Multimodal LLM Autonomous Classification & Auto-Department Routing (Roads, Waste, Water, Lighting)
2. 1-Click Zero-Touch Auto-Dispatch
3. On-Demand Department Status Inquests & Telemetry Feedback
4. Autonomous Continuous SLA Sweep (Auto-assignment, Inquiries, Escalations)
5. Autonomous Telemetry Monitoring Endpoint
"""

import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000"

def post_json(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode("utf-8"))

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode("utf-8"))

def run_tests():
    sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 60)
    print("CIVICSEVA AUTONOMOUS ENGINE VERIFICATION")
    print("=" * 60)

    # 1. Test Auto-Dispatch for Road Department
    print("\n[TEST 1] Auto-Dispatch Pothole -> Road Department")
    res1 = post_json("/api/complaints/auto-dispatch", {
        "text": "Dangerous crater pothole on University Road near bus station",
        "address": "University Road, Pune"
    })
    print(f"  Docket Created: #{res1['complaint_id']}")
    print(f"  Issue Detected: {res1['issue_type']}")
    print(f"  Auto-Checked Dept: {res1['department']}")
    print(f"  Confidence: {int(res1['confidence'] * 100)}%")
    assert "Road" in res1["department"], f"Expected Road Dept, got {res1['department']}"
    assert res1["status"] == "Assigned"
    print("  [PASS] Auto-routed to Road Department with zero human effort!")

    # 2. Test Auto-Dispatch for Waste Department
    print("\n[TEST 2] Auto-Dispatch Garbage -> Waste Management Department")
    res2 = post_json("/api/complaints/auto-dispatch", {
        "text": "Stinking overflowing garbage dump outside secondary school gate",
        "address": "School Road, Pune"
    })
    print(f"  Docket Created: #{res2['complaint_id']}")
    print(f"  Auto-Checked Dept: {res2['department']}")
    assert "Waste" in res2["department"], f"Expected Waste Dept, got {res2['department']}"
    print("  [PASS] Auto-routed to Waste Management Department!")

    # 3. Test Auto-Dispatch for Water Department
    print("\n[TEST 3] Auto-Dispatch Water Leak -> Water Supply Board")
    res3 = post_json("/api/complaints/auto-dispatch", {
        "text": "Clean drinking water pipeline cracked and gushing water across market",
        "address": "Market Road, Pune"
    })
    print(f"  Docket Created: #{res3['complaint_id']}")
    print(f"  Auto-Checked Dept: {res3['department']}")
    assert "Water" in res3["department"], f"Expected Water Dept, got {res3['department']}"
    print("  [PASS] Auto-routed to Water Supply Board!")

    # 4. Test On-Demand Status Inquest to Department
    cid = res1["complaint_id"]
    print(f"\n[TEST 4] Autonomous Status Inquest for Docket #{cid}")
    inq = post_json(f"/api/complaints/{cid}/auto-inquiry", {})
    print(f"  Department Inquired: {inq['department']}")
    print(f"  Inquiry Notice:\n{inq['inquiry_dispatched'][:120]}...")
    print(f"  Telemetry Response: {inq['acknowledgment']}")
    assert inq["follow_up_count"] >= 1
    print("  [PASS] Status inquiry delivered and acknowledged!")

    # 5. Test Autonomous Sweep
    print("\n[TEST 5] Autonomous System SLA & Escalation Sweep")
    sweep = post_json("/api/agent/autonomous-sweep", {"force_demo": True})
    print(f"  Timestamp: {sweep['sweep_timestamp']}")
    print(f"  Tickets Scanned: {sweep['tickets_scanned']}")
    print(f"  Actions Executed: {len(sweep['actions_taken'])}")
    for act in sweep['actions_taken'][:3]:
        print(f"    - #{act['complaint_id']}: {act['summary']}")
    assert sweep["autonomous_status"] == "ONLINE_ACTIVE"
    print("  [PASS] Autonomous sweep executed successfully!")

    # 6. Test Autonomous Stats Telemetry
    print("\n[TEST 6] Autonomous Telemetry Endpoint")
    stats = get_json("/api/agent/autonomous-stats")
    print(f"  Agent Status: {stats['agent_status']}")
    print(f"  Active Monitored Tickets: {stats['active_monitored_tickets']}")
    print(f"  Total Auto-Dispatched: {stats['total_auto_dispatched']}")
    print(f"  Total Auto-Inquiries: {stats['total_auto_inquiries']}")
    print(f"  Total Escalations: {stats['total_escalations']}")
    assert stats["agent_status"] == "ONLINE_AUTONOMOUS"
    print("  [PASS] Operational telemetry verified!")

    print("\n" + "=" * 60)
    print("ALL 6 AUTONOMOUS ENGINE SUITES PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
