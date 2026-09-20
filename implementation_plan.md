# Autonomous Geo-Proximity Officer Dispatch & Zero-Click Photo Ingestion

## Proposed Architecture & Unique Features

This plan introduces next-level autonomy and unique, high-impact capabilities to CivicSeva:
1. **Autonomous Geo-Proximity Officer Dispatch**: Real-time municipal field officer fleet with GPS coordinates, availability statuses, and workload metrics. The autonomous agent computes geospatial Haversine distances to locate the closest, unencumbered officer in the responsible department and dispatches the work order directly to them with ETA and route telemetry.
2. **Zero-Click Photo-Only Instant Ingestion**: Citizens simply upload or snap a photo. The system auto-detects browser/device GPS, runs multimodal Vision AI to identify the problem, drafts the grievance, resolves the department, and dispatches to the nearest officer with zero manual typing.
3. **Autonomous Duplicate Detection & Neighborhood Clustering**: Geospatial and categorical clustering detects multiple citizens reporting the same defect within a 50m radius, clustering them into a master incident and boosting priority rather than creating duplicate work orders.
4. **Live Municipal Dispatch Radar (Map & Telemetry)**: An interactive geospatial radar on the Map and Authority Dashboard showing moving/available officers, radar coverage circles, and live animated dispatch vectors connecting complaints to assigned squad engineers.
5. **Simulated Officer Mobile Task Alert**: Generates realistic municipal mobile dispatch dispatches (SMS/WhatsApp format) with GPS navigation coordinates and response deadlines.

---

## Proposed Changes

### Backend Component

#### [NEW] [officer.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/models/officer.py)
- Defines `Officer` model: `id`, `name`, `role`, `department_id`, `phone`, `current_lat`, `current_lon`, `current_address`, `status` (`AVAILABLE`, `ON_DUTY`, `BUSY`), `active_tickets`, `rating`, `avatar_url`.

#### [MODIFY] [complaint.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/models/complaint.py)
- Adds `assigned_officer_id`, `assigned_officer_name`, `assigned_officer_phone`, `officer_distance_km`, `officer_eta_minutes`, `cluster_id`, `is_duplicate` columns and foreign key relationship to `Officer`.

#### [MODIFY] [seed_data.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/database/seed_data.py)
- Seeds 8-10 realistic municipal field officers across Road, Waste, Water, Electrical, and Drainage departments stationed at strategic GPS coordinates across Pune (Shivajinagar, Camp, Kothrud, Deccan, University, Swargate).

#### [MODIFY] [autonomous_agent.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/services/autonomous_agent.py)
- Implements `find_nearest_available_officer(db, department_id, lat, lon)` using Haversine formula and workload balancing.
- Implements `detect_duplicate_or_cluster(db, category, lat, lon)` for duplicate prevention and cluster creation within 50m.
- Updates `auto_dispatch_complaint()` to autonomously assign the nearest officer, compute ETA, generate officer mobile dispatch alert, and log the dispatch in agent actions and complaint history.

#### [MODIFY] [complaints.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/api/complaints.py)
- Adds `POST /api/complaints/photo-instant-dispatch` for direct 1-step photo upload with auto-GPS, vision inference, department check, and officer assignment.

#### [NEW] [officers.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/api/officers.py)
- Implements `GET /api/officers` (lists all field officers with live status & GPS coordinates for radar display) and `GET /api/officers/{id}/tasks`.

#### [MODIFY] [main.py](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/backend/app/main.py)
- Registers the new `officers_router`.

---

### Frontend Component

#### [NEW] [officerApi.js](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/frontend/src/api/officerApi.js)
- API client methods for fetching officers and officer task allocations.

#### [MODIFY] [ReportIssuePage.jsx](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/frontend/src/pages/ReportIssuePage.jsx)
- Adds a prominent **"📸 Instant Photo AI Dispatch"** mode:
  - User simply drops/uploads an image.
  - Automatically queries browser HTML5 GPS (`navigator.geolocation.getCurrentPosition`).
  - Dispatches immediately in 1 step.
  - Shows celebratory card with assigned officer details (Name, Badge, Phone, Distance, ETA, and Mobile Task Alert).

#### [MODIFY] [TrackComplaintPage.jsx](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/frontend/src/pages/TrackComplaintPage.jsx)
- Displays the **Assigned Municipal Field Officer Card**:
  - Officer Name & Role (e.g. *Rajesh Patil, Executive Junior Engineer - Road Infrastructure*)
  - Live Distance & Estimated Arrival Time (e.g. *0.8 km away &bull; ETA: 14 minutes*)
  - Officer Direct Squad Phone: *+91 98230 44120*
  - Simulated Mobile Dispatch Notice & Navigation Link.
  - Cluster / Duplicate indicator if linked to neighborhood reports.

#### [MODIFY] [MapViewPage.jsx](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/frontend/src/pages/MapViewPage.jsx)
- Adds **"🛰️ Live Municipal Dispatch Radar"** mode:
  - Plots Field Officers on the map with distinct animated badges (`Available` green, `On Duty` amber).
  - Shows animated vector lines connecting complaints to their assigned field officers.
  - Filter by department and officer availability.

#### [MODIFY] [AuthorityDashboard.jsx](file:///c:/Users/Aarth%20Shah/OneDrive/Desktop/SevaAI/SevaAI/frontend/src/pages/AuthorityDashboard.jsx)
- Displays officer assignment badges and squad dispatch statuses on triage cards.

---

## Verification Plan

### Automated Tests
- Run `tests/test_officer_dispatch.py` testing:
  1. Officer seeding and `GET /api/officers` endpoint.
  2. Haversine distance calculation and nearest available officer resolution for target departments.
  3. `POST /api/complaints/auto-dispatch` verifying assigned officer ID, distance, ETA, and officer task count update.
  4. Duplicate detection & neighborhood clustering logic within 50m.
  5. `POST /api/complaints/photo-instant-dispatch` with photo upload and auto-GPS.

### Manual Verification
- Verify browser experience at `http://localhost:5173/report`:
  - Upload a photo with 1-click photo auto-dispatch.
  - Verify officer assignment card appears with distance, ETA, and phone.
- Verify `http://localhost:5173/track/CS1008`:
  - Verify assigned field engineer card is rendered.
- Verify `http://localhost:5173/map`:
  - Verify field officer pins and radar vectors appear on the interactive map.
