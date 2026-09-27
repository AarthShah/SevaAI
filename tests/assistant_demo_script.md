# CivicSeva Assistant Demo

A concise, 2–3 minute interactive demonstration script highlighting the role-, page-, and state-aware capabilities of the CivicSeva Contextual Assistant.

---

## Part 1: Citizen Persona Walkthrough

### Step 1: General Inquiries & Public Guidance
- **User Action**: Open the CivicSeva homepage (`/`). Click the **Assistant** launcher in the navigation bar. Type:
  > *"How do I report a pothole?"*
- **Expected Assistant Behavior**:
  - The assistant explains the multi-step reporting process: capturing a clear photo, AI-assisted department & severity classification, location verification, and final submission.
  - Subtitle displays `"Context-aware guidance"`.
  - It maintains advisory boundaries and does **not** claim a complaint has already been logged.
- **Feature Demonstrated**: Role-safe public/citizen onboarding guidance without premature mutations.

---

### Step 2: Page-Aware Reporting Guidance
- **User Action**: Navigate to **Report Issue** (`/report`). Open the Assistant panel. Ask:
  > *"What should I do next?"*
- **Expected Assistant Behavior**:
  - The assistant detects the active page (`ReportIssuePage`) and header updates to `"Reporting guidance"`.
  - It identifies the current form stage (e.g. Step 1: Evidence Capture) and instructs the citizen to upload or capture a photo of the defect.
- **Feature Demonstrated**: Page awareness and active form state detection.

---

### Step 3: Progressive Workflow Assistance
- **User Action**: As the citizen uploads an image and advances through the form (or moves to Step 2/3), reopen the assistant and ask:
  > *"What should I do next?"*
- **Expected Assistant Behavior**:
  - Guidance dynamically adapts:
    - *When photo is analyzed*: Explains the suggested department, detected category, and confidence rating.
    - *At review stage*: Prompts the user to review the pre-filled title, description, and location pin before final submission.
- **Feature Demonstrated**: Dynamic, state-sensitive next-action guidance.

---

### Step 4: Complaint-Aware Tracking & Status Clarification
- **User Action**: Navigate to **Track Complaint** using any valid, authorized ticket visible in the demo environment (e.g. `/track/CS1001` or any active ticket number). Open the Assistant. Ask:
  > *"What does this status mean?"*
  *(Note: Use whatever valid complaint appears in the demo environment).*
- **Expected Assistant Behavior**:
  - Assistant header displays the complaint badge (e.g., `Docket #CS1001`).
  - The assistant contextually explains the complaint's active status (e.g., `Submitted`, `In Progress`, `Under Review`, or `Resolved`), describes what municipal actions occur in that phase, and outlines SLA expectations.
  - It does **not** hallucinate private officer phone numbers, uncommitted ETAs, or false resolution dates.
- **Feature Demonstrated**: Complaint authorization gating and read-only status explanation.

---

## Part 2: Municipal Authority Persona Walkthrough

### Step 1: Role Switch & Triage Overview
- **User Action**: Click **Municipal Portal** in the top navigation bar to switch to Authority mode. The dashboard navigates to the Command Center (`/authority`). Open the Assistant. Ask:
  > *"What should I focus on here?"*
- **Expected Assistant Behavior**:
  - Header displays dark operational theme with subtitle `"Operations · triage"`.
  - Prior citizen conversation is cleanly wiped upon role switch (complete session isolation).
  - Without any row selected, header shows **no ticket badge** (it does not assume a default selection).
  - The assistant provides high-level triage advice: prioritizing high-severity/overdue complaints, verifying AI department routing, and coordinating field squads.
- **Feature Demonstrated**: Cross-role session isolation and unselected triage state safety.

---

### Step 2: Explicit Complaint Selection & Operational Guidance
- **User Action**: In the Triage table, click any complaint row to open the ticket drawer. Reopen the Assistant. Ask:
  > *"What should I do with this complaint?"*
  *(Note: Use whatever valid complaint appears in the demo environment, e.g. CS1039, CS1001, or CS9002).*
- **Expected Assistant Behavior**:
  - Assistant header immediately reflects the selected complaint badge (e.g. `#[ID]`).
  - Assistant explains the specific issue category, current priority, and operational next steps (e.g., dispatching designated squad, reviewing AI recommendations).
  - It advises the officer to use the official dashboard controls (e.g. *Assign*, *Update Status*) rather than claiming to execute mutations itself.
- **Feature Demonstrated**: Explicit complaint context injection and mutation avoidance safety.

---

### Step 3: Multi-Section Operational Navigation
- **User Action**: Switch between different command center tabs:
  - Click **AI Review** (`/authority?tab=AI_REVIEW`), **Map** (`/authority?tab=MAP`), or **Analytics** (`/authority?tab=ANALYTICS`).
  - Open the Assistant in each section and ask:
    > *"Explain this page."*
- **Expected Assistant Behavior**:
  - Contextual header subtitle dynamically updates to match the active operational section:
    - `"Operations · AI_REVIEW"`
    - `"Operations · MAP"`
    - `"Operations · ANALYTICS"`
  - Assistant explains the purpose of each specialized module (e.g., reviewing AI triage confidence, visualizing geographic clusters, or auditing SLA compliance).
- **Feature Demonstrated**: Tab/sub-tab navigation awareness and contextual operational assistance.
