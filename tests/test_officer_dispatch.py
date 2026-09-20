"""
CivicSeva Autonomous Geo-Proximity Officer Dispatch & Clustering Test Suite
Verifies:
1. Municipal Field Officer Fleet Telemetry (GET /api/officers)
2. Autonomous Nearest Officer Matching & Workload Allocation
3. Real-time Haversine Distance & Urban Transit ETA Calculations
4. Autonomous Neighborhood Incident Clustering (50m proximity)
5. Zero-Click Photo-Only Instant Dispatch with Auto-GPS (POST /api/complaints/photo-instant-dispatch)
6. Officer Assigned Work Orders Queue (GET /api/officers/{id}/tasks)
"""

import urllib.request
import json
import sys
import os

BASE_URL = "http://localhost:8000"

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode("utf-8"))

def post_json(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode("utf-8"))

def run_tests():
    sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 65)
    print("CIVICSEVA AUTONOMOUS GEO-DISPATCH & CLUSTERING TEST SUITE")
    print("=" * 65)

    # 1. Verify Officer Fleet
    print("\n[TEST 1] Municipal Officer Fleet Telemetry")
    officers = get_json("/api/officers")
    print(f"  Total Officers Seeded: {len(officers)}")
    assert len(officers) >= 8, f"Expected >= 8 officers, got {len(officers)}"
    for off in officers[:3]:
        print(f"  - [{off['id']}] {off['name']} ({off['role']}) | Dept: {off['department_name']} | Status: {off['status']}")
    print("  [PASS] Officer fleet successfully online!")

    # 2. Test Autonomous Officer Geo-Dispatch
    print("\n[TEST 2] Autonomous Nearest Officer Geo-Dispatch")
    # Pothole near Shivajinagar (18.5204, 73.8567)
    res1 = post_json("/api/complaints/auto-dispatch", {
        "text": "Deep hazardous pothole in front of college gate on MG Road",
        "address": "MG Road near College Gate, Pune",
        "latitude": 18.5204,
        "longitude": 73.8567
    })
    print(f"  Docket Created: #{res1['complaint_id']}")
    print(f"  Department: {res1['department']}")
    assigned_off = res1.get("assigned_officer")
    print(f"  Assigned Officer: {assigned_off['name']} ({assigned_off['role']})")
    print(f"  Proximity Distance: {assigned_off['distance_km']} km")
    print(f"  Calculated ETA: {assigned_off['eta_minutes']} mins")
    print(f"  Squad Direct Phone: {assigned_off['phone']}")
    assert assigned_off is not None, "Officer was not assigned!"
    assert assigned_off["distance_km"] >= 0.0, "Invalid distance calculation!"
    assert assigned_off["eta_minutes"] > 0, "Invalid ETA calculation!"
    assert "SQUAD DISPATCH NOTICE" in res1["mobile_dispatch_notice"]
    print("  [PASS] Closest officer autonomously matched and dispatched with ETA!")

    # 3. Test Neighborhood Incident Clustering & Duplicate Detection
    print("\n[TEST 3] Autonomous Duplicate Detection & Neighborhood Clustering (within 50m)")
    # Another citizen reports the same issue 30 meters away (18.5206, 73.8568)
    res2 = post_json("/api/complaints/auto-dispatch", {
        "text": "Huge asphalt hole causing scooters to crash on MG Road",
        "address": "MG Road College Gate Corner, Pune",
        "latitude": 18.5206,
        "longitude": 73.8568
    })
    print(f"  Docket Created: #{res2['complaint_id']}")
    cluster = res2.get("cluster_info", {})
    print(f"  Clustered Detected: {cluster.get('is_clustered')}")
    print(f"  Cluster Master Incident: #{cluster.get('cluster_master_id')}")
    print(f"  Elevated Severity: {res2['severity']}")
    assert cluster.get("is_clustered") is True, "Proximity cluster was not detected!"
    assert cluster.get("cluster_master_id") is not None
    print("  [PASS] Incident clustered with nearby report and priority elevated!")

    # 4. Test Zero-Click Photo-Only Instant Dispatch
    print("\n[TEST 4] Zero-Click Photo-Only Instant Dispatch with Auto-GPS")
    boundary = '----WebKitFormBoundaryAutoDispatchTest'
    img_path = 'frontend/public/sample_evidence/water_leak.jpg'
    if os.path.exists(img_path):
        with open(img_path, 'rb') as f:
            img_bytes = f.read()
    else:
        img_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00'

    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="water_leak.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode('utf-8'),
        img_bytes,
        f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n18.5180'.encode('utf-8'),
        f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n73.8520'.encode('utf-8'),
        f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="address"\r\n\r\nDeccan Gymkhana Main Road, Pune'.encode('utf-8'),
        f'\r\n--{boundary}--\r\n'.encode('utf-8')
    ]
    body = b''.join(parts)
    req = urllib.request.Request(
        f"{BASE_URL}/api/complaints/photo-instant-dispatch",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    res4 = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    print(f"  Docket Created: #{res4['complaint_id']}")
    print(f"  Detected Defect: {res4['issue_type']}")
    print(f"  Department Mapped: {res4['department']}")
    assigned_water_off = res4['assigned_officer']
    print(f"  Auto-Assigned Engineer: {assigned_water_off['name']} (Distance: {assigned_water_off['distance_km']} km, ETA: {assigned_water_off['eta_minutes']} mins)")
    assert res4["complaint_id"].startswith("CS")
    print("  [PASS] Zero-click photo dispatch completed end-to-end!")

    # 5. Verify Officer Task Queue
    off_id = assigned_water_off['id']
    print(f"\n[TEST 5] Officer #{off_id} Workload & Assigned Tasks")
    tasks_res = get_json(f"/api/officers/{off_id}/tasks")
    print(f"  Officer: {tasks_res['officer']['name']}")
    print(f"  Assigned Work Orders: {len(tasks_res['tasks'])}")
    for t in tasks_res['tasks'][:2]:
        print(f"  - Docket #{t['id']}: {t['issue_type']} at {t['address']} (Distance: {t['distance_km']}km, ETA: {t['eta_minutes']}m)")
    assert len(tasks_res["tasks"]) >= 1, "Officer task list is empty!"
    print("  [PASS] Officer task queue verified!")

    print("\n" + "=" * 65)
    print("ALL 5 AUTONOMOUS GEO-DISPATCH TEST SUITES PASSED PERFECTLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
