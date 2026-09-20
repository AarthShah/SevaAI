# CIVICSEVA — AI-Powered Civic Issue Resolution Agent

> **"Report it. We understand it. We route it. We track it."**
> An autonomous multi-modal civic grievance resolution platform engineered for rapid municipal triage, evidence verification, grounded department routing, SLA tracking, and automated escalation.

---

## 1. Problem Statement

Citizens routinely encounter municipal civic issues such as hazardous potholes, overflowing solid waste, dark streetlight corridors, water main pipe bursts, and clogged stormwater drains. However, the civic reporting process is riddled with friction:
- Citizens rarely know which municipal department possesses jurisdictional responsibility.
- They struggle to quantify or articulate the technical severity or public safety impact.
- Municipal complaint forms are fragmented across disparate telephone lines and ward portals.
- Complaints routinely stall without accountability, timeline visibility, or statutory escalation.

CivicSeva changes this paradigm by functioning not as a basic chatbot, but as an **autonomous, end-to-end civic resolution agent**.

---

## 2. Solution Overview

CivicSeva ingests multimodal evidence (voice transcripts, natural-language text descriptions, uploaded camera photographs, and interactive GPS map pins), runs autonomous agentic reasoning to classify the issue and evaluate public safety risk, grounds the jurisdictional authority using a civic knowledge base (RAG), generates a formal municipal grievance draft, enforces **Human-in-the-Loop** verification before ledger registration, and monitors resolution SLA thresholds to trigger proactive follow-ups and statutory escalations.

```
Citizen Input (Voice / Photo / Text / Map)
                     ↓
             [Input Analyzer]
                     ↓
       [Multimodal Classifier Agent]
                     ↓
         [Vision Evidence Agent]
                     ↓
         [Severity Assessment Agent]
                     ↓
      [RAG-Grounded Department Agent]
                     ↓
       [Formal Complaint Generator]
                     ↓
       [Human-in-the-Loop Validation]
                     ↓
         [Municipal Registration]
                     ↓
           [SLA Tracking Agent]
                     ↓
        [Automated Follow-up Agent]
                     ↓
         [Vigilance Escalation Agent]
```

---

## 3. System Architecture & Tech Stack

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React-Leaflet, Lucide Icons, Web Audio API, Web Speech API, Axios | Citizen Portal, Multimodal Report Form, AI Analysis & Preview, Decision Trace UI, Authority Triage Console, Geospatial Map, Analytics, AI Benchmark Explorer |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy ORM, PostgreSQL (with SQLite zero-config fallback), Pydantic v2, PyJWT, Bcrypt | REST API Gateway, RBAC Auth, Complaint State Machine, Audit Trails, Evidence Uploads, SLA Engine |
| **AI / ML** | Python, Multi-Agent Orchestrator, Computer Vision (Pillow/NumPy/Torch feature extractor), RAG Vector/BM25 Knowledge Base, Benchmark Evaluation Suite | Multimodal Classification, Risk Severity Calibration, Department Jurisdiction Mapping, Grievance Synthesis, Metric Evaluation |
| **DevOps** | Docker, Docker Compose, Nginx | Multi-container microservice orchestration, port mapping, isolated volume management |

---

## 4. Project Folder Structure

```
CivicSeva/
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── sample_evidence/      # Sample photos for instant demo (pothole, garbage, streetlight, water)
│   ├── src/
│   │   ├── api/                  # Axios services (authApi, complaintApi, departmentApi, analyticsApi)
│   │   ├── components/           # Navbar, Footer, StatusBadge, LeafletMap, AudioRecorder, AgentTraceTimeline
│   │   ├── context/              # AuthContext (JWT + Fast Demo Personas), NotificationContext
│   │   ├── pages/                # Landing, Report, Track, CitizenDashboard, AuthorityDashboard, Map, Analytics, Evaluation, Auth
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/                  # auth, complaints, departments, analytics, agent, upload, notifications
│   │   ├── database/             # session.py (Postgres & SQLite auto-fallback), seed_data.py
│   │   ├── middleware/           # auth_middleware.py (JWT verification, RBAC)
│   │   ├── models/               # user, complaint, evidence, department, complaint_history, agent_action, escalation, notification
│   │   ├── schemas/              # Pydantic validation models
│   │   ├── services/             # complaint_service.py, aiml_client.py (microservice + in-process fallback)
│   │   ├── utils/                # security.py (bcrypt & JWT)
│   │   ├── config.py
│   │   └── main.py
│   ├── uploads/                  # Validated uploaded media assets
│   ├── requirements.txt
│   └── Dockerfile
│
├── aiml/
│   ├── agents/                   # civic_agent, classification_agent, severity_agent, department_agent, followup_agent
│   ├── vision/                   # issue_detector.py (Computer Vision edge/color variance feature analysis)
│   ├── nlp/                      # classifier.py, information_extractor.py, complaint_generator.py
│   ├── rag/                      # knowledge_base.py, retriever.py (grounded municipal citations)
│   ├── workflows/                # complaint_workflow.py (state graph & trace generation)
│   ├── evaluation/               # dataset.json (25 labeled cases), metrics.py (Accuracy, Precision, Recall, F1)
│   ├── prompts/                  # Zero-hallucination structured prompt contracts
│   ├── server.py                 # Standalone AIML microservice (Port 8001)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Autonomous Multi-Agent Pipeline

### A. Master Civic Agent (`aiml/agents/civic_agent.py`)
Central orchestrator that coordinates subagents, normalizes multimodal inputs, and compiles a comprehensive **Decision Trace** audit log for every step.

### B. Classification Agent (`aiml/agents/classification_agent.py`)
Ingests citizen natural language, transcribed voice speech, and visual inspection findings. Corroborates signals to classify into canonical civic categories:
- `POTHOLE` → Road Infrastructure
- `GARBAGE` → Waste Management & Sanitation
- `STREETLIGHT` → Electrical & Street Lighting
- `WATER_LEAKAGE` → Water Supply & Sewerage
- `DRAINAGE` → Drainage & Stormwater
- `ROAD_DAMAGE` → Road Infrastructure
- `OTHER` → General Civic Administration

### C. Evidence Agent (`aiml/vision/issue_detector.py`)
Extracts computer vision features (asphalt cavities, texture variance, debris clustering, night-time low-lux conditions, and specular water reflections). Explicitly avoids fabricating measurements without sensor verification.

### D. Severity Agent (`aiml/agents/severity_agent.py`)
Calculates public safety risk, traffic obstruction, bio-hazard contagion, and structural collapse hazards. Outputs **AI-estimated severity** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with explicit grounding rationale.

### E. Department Agent (`aiml/agents/department_agent.py`)
Employs RAG over municipal bylaws (`aiml/rag/knowledge_base.py` and `retriever.py`) to determine the responsible civic department. Produces grounded explanations such as:
> *"Based on civic regulations in 'Road Surface Defects, Potholes & Asphalt Degradation' (KB_ROAD_001), issues relating to road infrastructure are jurisdictionally assigned to the Municipal Road Department."*

### F. Complaint Generator (`aiml/nlp/complaint_generator.py`)
Formats a standardized public service grievance notice complete with Incident Summary, Technical Observations, Public Hazard Notes, and Requested Relief.

### G. Human-in-the-Loop Gateway
Presents the AI analysis card to the citizen. Allows inline editing of severity and descriptions before the citizen executes **"Confirm & Submit"**.

### H. Follow-up & Escalation Agents (`aiml/agents/followup_agent.py`)
Monitors elapsed complaint age against configurable SLA thresholds (High: 24h, Medium: 48h, Low: 72h). Proactively generates follow-up notices and escalates unaddressed dockets to Level 1 Ward Vigilance and Zonal Commissioners.

---

## 6. AI Evaluation & Benchmark Metrics

The AI subsystem incorporates a quantitative benchmark evaluation module (`aiml/evaluation/metrics.py`) tested against a curated 25-case civic ground-truth dataset (`aiml/evaluation/dataset.json`):

| Evaluation Metric | Benchmark Score |
| :--- | :--- |
| **Issue Classification Accuracy** | **88.0%** (22/25 matches) |
| **Department Routing Accuracy** | **88.0%** (22/25 matches) |
| **Severity Calibration Accuracy** | **84.0%** (21/25 matches) |
| **Agent Workflow Completion Rate** | **100.0%** (All 6 pipeline stages executed) |
| **Evidence Grounding Rate** | **100.0%** (All outputs ground in valid KB IDs) |
| **Macro F1-Score** | **0.879** |

```
PER-CLASS METRICS:
  POTHOLE        : Precision = 1.000 | Recall = 1.000 | F1 = 1.000 (n=4)
  GARBAGE        : Precision = 0.800 | Recall = 1.000 | F1 = 0.889 (n=4)
  STREETLIGHT    : Precision = 1.000 | Recall = 0.750 | F1 = 0.857 (n=4)
  WATER_LEAKAGE  : Precision = 1.000 | Recall = 0.750 | F1 = 0.857 (n=4)
  DRAINAGE       : Precision = 0.750 | Recall = 0.750 | F1 = 0.750 (n=4)
  ROAD_DAMAGE    : Precision = 1.000 | Recall = 1.000 | F1 = 1.000 (n=3)
  OTHER          : Precision = 0.667 | Recall = 1.000 | F1 = 0.800 (n=2)
```

Run the evaluation directly via CLI:
```bash
python aiml/evaluation/metrics.py
```

---

## 7. Database Schema

- **`users`**: `id`, `name`, `email`, `password_hash`, `role` (`citizen`, `authority`, `admin`), `created_at`
- **`departments`**: `id`, `name`, `category`, `location`, `contact`, `email`, `sla_hours`
- **`complaints`**: `id` (e.g. `CS1001`), `citizen_id`, `category`, `issue_type`, `description`, `generated_complaint`, `latitude`, `longitude`, `address`, `severity`, `status`, `department_id`, `ai_confidence`, `severity_reason`, `grounded_explanation`, `recommended_action`, `follow_up_count`, `created_at`, `updated_at`
- **`evidence`**: `id`, `complaint_id`, `type` (`image`, `audio`), `file_url`, `description`, `ai_analysis`, `created_at`
- **`complaint_history`**: `id`, `complaint_id`, `old_status`, `new_status`, `changed_by`, `remarks`, `timestamp`
- **`agent_actions`**: `id`, `complaint_id`, `agent_name`, `action`, `input_summary`, `output_summary`, `timestamp`
- **`escalations`**: `id`, `complaint_id`, `reason`, `level` (1, 2, 3), `created_at`, `resolved_at`
- **`notifications`**: `id`, `user_id`, `complaint_id`, `message`, `read`, `created_at`

---

## 8. Seed Demo Accounts & Test Personas

CivicSeva automatically seeds demo accounts and rich pre-populated complaints (`CS1001` through `CS1005`):

| Persona | Email | Password | Role | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicseva.org` | `citizen123` | `citizen` | Report complaints, voice input, track dockets, request follow-ups |
| **Ward Officer** | `authority@civicseva.org` | `authority123` | `authority` | Triage queue, assign departments, transition status, add remarks |
| **Commissioner** | `admin@civicseva.org` | `admin123` | `admin` | Overall municipal oversight, review escalations, system analytics |

> 💡 **Hackathon Tip:** Use the **"Demo Role"** switcher in the navbar or the one-click persona buttons on the Login page to instantly swap roles without retyping passwords.

---

## 9. Primary Hackathon Demonstration Scenario

1. **Step 1:** Open CivicSeva at `http://localhost:5173`.
2. **Step 2:** Click **"Launch Hackathon Demo"** on the hero banner (or click **"Report Issue"** → click the preset `🚧 Pothole (High)`).
3. **Step 3:** The system pre-fills:
   - Citizen description: *"There is a large deep pothole near the main road college gate..."*
   - Location: `MG Road near College Main Gate, Pune` (GPS pin selected on map).
   - Evidence: Attached road surface damage photo.
4. **Step 4:** Click **"Analyze with CivicSeva AI"**.
5. **Step 5:** Within seconds, the **Autonomous AI Analysis Card** displays:
   - **Issue Type:** Pothole
   - **Category:** Road Infrastructure
   - **Severity:** HIGH (`AI-estimated severity: HIGH` due to arterial traffic hazard)
   - **Confidence:** 94%
   - **Responsible Department:** Municipal Road Department (Grounded in SOP `KB_ROAD_001`)
   - **Generated Grievance Notice:** Complete technical work order draft
   - **AI Decision Trace:** 7-step visual audit trail
6. **Step 6:** Inspect the three-way separation:
   - `[AI Predictions]` vs `[User Provided]` vs `[System Generated]`
7. **Step 7:** Click **"Confirm & Submit Complaint"**.
8. **Step 8:** The complaint is registered on the ledger (e.g., `#CS1006`).
9. **Step 9:** The **Tracking Page** displays the real-time status stepper: `Submitted` → `Acknowledged` → `Assigned` → `In Progress` → `Resolved`.
10. **Step 10:** Switch to **Authority View** (click `Authority View` in the navbar):
    - See the newly logged complaint in the triage queue.
    - Click **"Manage & Triage"** → change status to `Assigned` → enter official remarks → commit update.
11. **Step 11:** Test the SLA Escalation workflow on docket `#CS1004` (Water Leakage overdue past SLA threshold) to see automated escalation rules in action!

---

## 10. Quickstart Installation Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

### Option A: Local One-Command Setup (Zero Docker Required)

CivicSeva is engineered with **zero external friction**: if PostgreSQL is not running, the backend automatically uses a local SQLite database (`backend/civicseva.db`) and seeds it on startup!

#### 1. Setup Backend & AIML
```bash
# In project root:
cp .env.example .env

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run build   # Or run dev mode
```

#### 3. Run the Services

**Terminal 1 — Backend (Port 8000):**
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — AIML Microservice (Port 8001):**
```bash
python aiml/server.py
```
*(Note: If the AIML microservice is not running, the backend automatically falls back to in-process execution!)*

**Terminal 3 — Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### Option B: Docker Compose

To launch the complete containerized stack (PostgreSQL + Backend + AIML + Frontend Nginx):

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend Swagger API Docs: `http://localhost:8000/docs`
- AIML Service: `http://localhost:8001/docs`

---

## 11. Key API Reference

- `POST /api/complaints/analyze` — Multimodal AI analysis (returns predictions, grounded explanation, generated draft, and decision trace without committing).
- `POST /api/complaints` — Submits confirmed complaint to ledger.
- `GET /api/complaints` — Lists complaints with filters (`status`, `category`, `severity`, `search`).
- `GET /api/complaints/{id}` — Returns full complaint dossier including evidence, history, agent actions, and escalations.
- `PATCH /api/complaints/{id}/status` — Authority endpoint to transition status, reassign department, and record remarks.
- `POST /api/complaints/{id}/follow-up` — Triggers citizen follow-up inquiry.
- `POST /api/complaints/{id}/escalate` — Escalates complaint to higher authority.
- `GET /api/departments` — Lists municipal departments and SLA hours.
- `GET /api/analytics` — Real-time municipal dashboard summary metrics.
- `GET /api/agent/trace/{id}` — Returns step-by-step agent action trace.
- `GET /api/agent/evaluate` — Executes the 25-case AI benchmark evaluation harness.
- `POST /api/upload/image` — Secure multipart image upload with MIME & size validation.
- `POST /api/upload/audio` — Secure audio voice recording upload.

---

## 12. Responsible AI Governance

- **Zero Direct Hallucination:** Predictions cite verifiable Knowledge Base articles (`KB_ROAD_001`, etc.). If information is absent, the system flags it as `unknown` or requests clarification.
- **Human-in-the-Loop:** AI assists rather than dictates; citizen reviews the draft and retains final submission control.
- **Calibration Transparency:** Severity is explicitly presented as *"AI-estimated severity"* with reasoning, never as an unverified objective certainty.
- **Immutable Audit Trail:** All agent inferences and authority status modifications are permanently logged in `agent_actions` and `complaint_history`.

---

## 13. Limitations & Future Scope

- **Edge IoT Integration:** Future iterations can ingest real-time vibration telemetry from municipal public buses to autonomously detect pothole clusters.
- **WhatsApp / SMS Gateway:** Integrate Twilio or Gupshup for voice notes and photo submissions over WhatsApp.
- **Satellite InSAR Integration:** Incorporate Sentinel-1 satellite radar data for macro-level roadbed subsidence and sinkhole monitoring.

---

## 14. License

CivicSeva is released under the **MIT License**. Built for the 24-hour AI Hackathon.
