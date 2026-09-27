# CivicSeva Assistant: Live Demo Talk Track

A practical, verbatim presenter script designed for a seamless 2–3 minute live walkthrough during hackathon evaluations and project presentations.

---

## Part 1: Citizen Persona Walkthrough (1.5 Minutes)

### Step 1: General Inquiries & Public Guidance
- **Presenter Says**: 
  > *"Let's start from the perspective of a resident. When a citizen visits CivicSeva, they often have questions about how civic reporting works before touching any forms. Let's open our Assistant launcher in the navigation bar."*
- **Action**: Click the **Assistant** button in the top navbar on `/`. Type and submit:
  > *"How do I report a pothole?"*
- **Expected Behavior**: Assistant explains the 4-step reporting workflow clearly.
- **What to Point Out**:
  > *"Notice how the assistant gives clear, structured guidance on photo requirements and verification, but it clearly understands that no complaint exists yet—it doesn't hallucinate that a ticket was created."*

---

### Step 2: Page Awareness on Report Issue
- **Presenter Says**: 
  > *"Now let's head over to the actual reporting flow. As soon as we navigate to 'Report Issue', watch the assistant's header subtitle."*
- **Action**: Click **Report Issue** in the navigation bar (`/report`). Open the Assistant. Ask:
  > *"What should I do next?"*
- **Expected Behavior**: Subtitle displays `"Reporting guidance"`. Assistant instructs the user to upload a clear photo of the civic defect.
- **What to Point Out**:
  > *"Notice that the assistant immediately recognized that we changed pages. Without us mentioning where we are, it knows we're on Step 1 of the reporting flow and tells us to upload a photo."*

---

### Step 3: Progressive Form Guidance
- **Presenter Says**: 
  > *"As the user uploads evidence and the AI model classifies the department, the assistant's context updates continuously."*
- **Action**: Progress through the form (or highlight the AI classification step) and ask:
  > *"What should I do next?"*
- **Expected Behavior**: Assistant advises the citizen on reviewing the suggested department and confirming the location pin before submission.
- **What to Point Out**:
  > *"The assistant stays in sync with our active form progress. It explains why a department was suggested, turning what used to be a black-box AI result into an understandable recommendation."*

---

### Step 4: Complaint-Aware Tracking
- **Presenter Says**: 
  > *"Once a ticket is logged, citizens want to know what's happening. Let's visit an authorized tracking page."*
- **Action**: Navigate to Track Complaint (`/track/CS1001` or any active demo ticket). Open the Assistant. Ask:
  > *"What does this status mean?"*
- **Expected Behavior**: Header displays `Docket #CS1001`. Assistant contextually explains the active status (e.g. `In Progress` or `Submitted`) and outlines the next municipal milestone.
- **What to Point Out**:
  > *"Look at the header badge: `Docket #CS1001`. The assistant securely loaded this ticket's real history from the database. It explains the status without leaking private officer phone numbers or making up unrealistic resolution dates."*

---

## Part 2: Municipal Authority Persona Walkthrough (1.5 Minutes)

### Step 1: Role Switch & Triage Overview
- **Presenter Says**: 
  > *"Now let's switch hats to a Municipal Operations Officer. In the navbar, I'll click 'Municipal Portal'."*
- **Action**: Click the **Municipal Portal** switcher in the navbar. Open the Assistant on `/authority`. Ask:
  > *"What should I focus on here?"*
- **Expected Behavior**: Dark operational launcher active (`bg-slate-800`), header subtitle `"Operations · triage"`. Previous citizen conversation is completely wiped (0 messages leaked). No ticket badge is shown.
- **What to Point Out**:
  > *"Two critical features here: First, complete session isolation—our citizen conversation was immediately wiped when we switched roles. Second, in triage, it doesn't assume any default complaint is selected; it guides the officer to focus on High and Critical priority queues."*

---

### Step 2: Explicit Complaint Selection in Triage
- **Presenter Says**: 
  > *"Now let's click an actual complaint in the triage table to open its drawer."*
- **Action**: Click any row in the triage table (e.g., `#CS1039` or `#CS9002`). Open the Assistant. Ask:
  > *"What should I do with this complaint?"*
- **Expected Behavior**: Header updates with the ticket badge (e.g., `#CS9002`). Assistant summarizes the issue and recommends dispatching the designated field squad.
- **What to Point Out**:
  > *"The assistant detected our row click and loaded the ticket context. But notice: it doesn't say 'I dispatched the squad.' It respects our read-only safety policy and directs the officer to click the 'Assign' button in the dashboard. Humans stay in control."*

---

### Step 3: Multi-Tab Operations Awareness
- **Presenter Says**: 
  > *"Finally, let's explore other command center sections, like AI Review or Analytics."*
- **Action**: Click the **AI Review** tab (`/authority?tab=AI_REVIEW`) or **Analytics**. Open the Assistant. Ask:
  > *"Explain this page."*
- **Expected Behavior**: Subtitle updates to `"Operations · AI_REVIEW"`. Assistant explains how to verify confidence ratings and automated dispatch logs.
- **What to Point Out**:
  > *"Whether the officer is looking at triage, geographic map pins, or automated dispatch logs, the assistant dynamically changes its operational guidance to match that exact screen."*

---

## Part 3: "What Makes It Smart?"

| Dimension | Generic Chatbot | CivicSeva Contextual Assistant |
|---|---|---|
| **First Impression** | *"Hello! How can I help you today?"* | *"You're on Report Issue (Step 1). Upload a photo to begin AI analysis."* |
| **Page Awareness** | Completely blind to current screen or URL. | Injects active route, sub-tab, and section into every prompt. |
| **Role Awareness** | Same generic persona for all visitors. | Adapts tone and depth between Citizen and Municipal Officer. |
| **Complaint Grounding** | Guesses or invents ticket details (hallucination). | Loads authorized database record with strict ownership gating. |
| **System Safety** | May attempt actions or claim false completions. | Strictly read-only; guides users to verified UI buttons. |
| **Offline Reliability** | Fails completely if external API drops. | Deterministic offline rule engine provides instant fallback. |
