# AI-AcadPredict — Live Demonstration Checklist & Presentation Script

This checklist provides an examiner-ready, step-by-step presentation script for demonstrating **AI-AcadPredict** in college evaluations, viva voce, and project defenses.

---

## 1. Pre-Demo Verification Checklist

Complete these checks 5 minutes before your presentation:

- [ ] **Docker Desktop Running:** Daemon active and healthy.
- [ ] **Containers Active:** Run `docker compose ps` in PowerShell. All 4 services (`acadpredict-mysql`, `acadpredict-ai-service`, `acadpredict-spring-backend`, `acadpredict-frontend`) must show `Up (healthy)`.
- [ ] **Frontend Accessible:** Open `http://localhost:5173` in your browser.
- [ ] **Backend API Health:** Open `http://localhost:8081/api/health` — response must be `{"status":"UP","database":"CONNECTED"}`.
- [ ] **AI Microservice Health:** Open `http://localhost:8000/health` — response must be `{"status":"healthy","model_loaded":true}`.
- [ ] **Test File Ready:** Have a sample PDF or TXT file on your desktop (e.g., `Demo_Charter.pdf`) ready for the document upload/download demo.
- [ ] **Dev Accounts Available:** `coordinator@college.edu` (`CoordinatorPass123!`), `faculty@college.edu` (`FacultyPass123!`).

---

## 2. Live Demonstration Sequence (Step-by-Step)

### Phase 1: Student Onboarding & Student Dashboard (2 Minutes)
1. **Open Frontend:** Navigate to `http://localhost:5173/register`.
2. **Register a Fresh Student:**
   - **Name:** `Ananya Demo`
   - **Email:** `ananya.demo@college.edu`
   - **Password:** `DemoPass123!`
   - Click **Register**.
3. **Showcase Real Data & Student Dashboard:**
   - Point out to the examiner: The heading says **"Student Dashboard"** and the greeting reads **"Welcome back, Ananya Demo"** with badge **"Student"**.
   - Show that personal active projects = 0, completed tasks = 0%, milestones = 0.
   - Explain to the examiner that **zero fake/sample metrics are hardcoded**. Everything is driven by live queries to MySQL.

### Phase 2: Project Proposal & Classification (2 Minutes)
1. **Submit Proposal:** Click **Submit Proposal** (`/student/proposal`).
   - **Title:** `Autonomous IoT Campus Energy Optimizer`
   - **Domain:** `Internet of Things & Embedded Systems`
   - **Description:** `Smart sensor network for automated HVAC and lighting control.`
   - **Objectives:** `Reduce peak campus electricity consumption by 25%.`
   - Click **Submit Project Proposal**.
2. **Inspect Project Classification:**
   - Navigate to **Proposal** and **My Projects**.
   - Project appears with status **`PROPOSED`** (or `Pending Review`).
   - Note that no faculty guide is assigned yet.

### Phase 3: Coordinator Dashboard, Workload & Guide Allocation (3 Minutes)
1. **Log Out** and log in as Coordinator:
   - **Email:** `coordinator@college.edu` | **Password:** `CoordinatorPass123!`
2. **Showcase Coordinator Dashboard:**
   - Point out the heading: **"Coordinator Dashboard"** with badge **"Coordinator"**.
   - Showcase the **7 Genuine Department Metrics**: Total Projects, Awaiting Review, Approved, Rejected, Unassigned Guides, Overdue Milestones, and High Risk Projects.
3. **Faculty Workload Overview:**
   - Open the **Faculty Workload Overview** table.
   - Show the real registered faculty accounts, their assigned project count, overdue milestones, and high risk projects.
   - Highlight the **Unassigned Projects** section showing `Autonomous IoT Campus Energy Optimizer`.
4. **Allocate Faculty Guide:**
   - In **My Projects**, locate the project and click **Assign Guide**.
   - Select `Dr. Sharma` from the dropdown and save.
   - Refresh: The project card now displays **Guide: Dr. Sharma**.

### Phase 4: Faculty Dashboard, Proposal Review & Supervisor Feedback (3 Minutes)
1. **Log Out** and log in as Faculty:
   - **Email:** `faculty@college.edu` | **Password:** `FacultyPass123!`
2. **Showcase Faculty Dashboard:**
   - Point out heading: **"Faculty Dashboard"** with badge **"Faculty"**.
   - Showcase the **5 Genuine Supervision Metrics**: Assigned Projects (1), Proposals Pending Review, Upcoming Milestones, Overdue Milestones, High Delay Risk.
3. **Review Proposal with Academic Feedback:**
   - Open **Pending Review** or the review queue.
   - Click **Review Proposal**.
   - Select **Approved**.
   - Enter Academic Feedback: *"Proposal approved. Focus first on sensor placement and power safety."*
   - Click **Submit Review**.
   - Project status transitions to **`APPROVED`** with reviewer identity and timestamp stored.

### Phase 5: Student Persistent Progress & Task Delegation (3 Minutes)
1. **Log back in as Student:** `ananya.demo@college.edu` | `DemoPass123!`.
2. **Inspect Proposal Status & Reviewer Feedback:**
   - In **Proposal** and **My Projects**, the student sees status **`APPROVED`**, assigned guide **Dr. Sharma**, and the supervisor's exact review feedback.
3. **Update Persistent Project Progress:**
   - On the project card in **My Projects**, click **Update Progress**.
   - Move the interactive slider to **45%** and click **Save Progress**.
   - Refresh the browser (F5) to demonstrate that progress is permanently saved in MySQL and reflects across cards and dashboards.
4. **Create Tasks with Assignees:**
   - Go to **Tasks** (`/student/tasks`).
   - Create task: `Sensor Microcontroller Firmware` (Priority: `HIGH`, Status: `IN_PROGRESS`, Assignee: `Ananya Demo`).

### Phase 6: Supervisor Milestone Evaluation & Task Assignment (2 Minutes)
1. **Create Milestone as Student:**
   - Go to **Milestones** (`/student/milestones`).
   - Create milestone: `Sprint 1 Architecture Spec` (Due in 30 days).
2. **Switch to Faculty:**
   - In the Faculty Dashboard, open **Supervisor Feedback & Milestone Review**.
   - Select the milestone, set status to **`REVIEWED`**, and enter feedback: *"Hardware schematics meet departmental specifications."* Save.
   - Switch back to student: The student immediately sees the **`REVIEWED`** badge and supervisor feedback.
3. **Faculty Assigns Student to Task:**
   - On Faculty Dashboard, click **Assign Student to Task**.
   - Select project, choose team member, pick task, and save assignment.

### Phase 7: Coordinator Department Follow-Up & Account Provisioning (3 Minutes)
1. **Switch to Coordinator:** `coordinator@college.edu`.
2. **Record Departmental Follow-Up Note:**
   - In the Coordinator Dashboard, open **Department Review History & Follow-Up**.
   - Click **Add / Edit Follow-Up Note** on the project.
   - Enter note: *"Mid-term demonstration scheduled for Nov 20."* and save.
   - Show that the note persists with author and timestamp.
3. **Demonstrate Account Creation:**
   - Click **+ Add User Account** on the Coordinator Dashboard.
   - Create a new Faculty account: `dr.patel@college.edu`, Name: `Dr. Patel`, Role: `FACULTY`, Password: `FacultyPass123!`.
   - Log out and log in with `dr.patel@college.edu` to prove that the account works and receives full `FACULTY` privileges.

### Phase 8: Safe Project Deletion (2 Minutes)
1. **Create an Isolated Test Project:**
   - Student creates `Test Disposable Capstone`.
2. **Attempt Deletion (Hard Confirmation):**
   - Click **Delete Project**.
   - Notice the security check: Requires typing the exact project title `Test Disposable Capstone`.
   - Click **Confirm Delete**.
   - Project is removed cleanly. Explain that all filesystem documents and database rows were cascadingly cleaned up without affecting user accounts or unrelated projects.

### Phase 9: AI Delay Risk Prediction & Documents (2 Minutes)
1. **Upload Document:** Upload `Demo_Charter.pdf` in **Documents**. Download it back to show file integrity from filesystem storage.
2. **Run AI Prediction:** In **Risk Prediction**, run the Random Forest model with 11 metrics. Demonstrate predicted delay days, delay probability, and AI recommendations.

### Phase 10: Negative Authorization & Security Proofs (2 Minutes)
Show the examiner how the system stops unauthorized actions:
1. **Student cannot review proposals:** Attempting `PUT /api/projects/{id}/review` returns **HTTP 403 Forbidden**.
2. **Student cannot access staff user management:** Attempting `POST /api/users` returns **HTTP 403 Forbidden**.
3. **Faculty cannot create Faculty accounts:** Faculty calling `POST /api/users` with `role: "FACULTY"` returns **HTTP 403 Forbidden**.
4. **No ADMIN role exists:** Attempting to register or create an `ADMIN` role returns **HTTP 400 Bad Request**.
5. **Cross-student isolation:** Non-owner student attempting to update progress or delete a project returns **HTTP 403 Forbidden**.
6. **Passwords:** Stored as BCrypt hashes in MySQL; zero secrets leaked in API responses.

---

## 3. Database Proof Queries for Examiners

Run these queries in PowerShell to show real MySQL data:

```powershell
docker compose exec mysql mysql -u acadpredict_user -pacadpredict_pass acadpredict_db -e "
SELECT id, title, status, progress, faculty_guide_id, review_feedback, coordinator_notes FROM projects;
"
```

```powershell
docker compose exec mysql mysql -u acadpredict_user -pacadpredict_pass acadpredict_db -e "
SELECT id, title, review_status, review_feedback, reviewed_by FROM milestones;
"
```

```powershell
docker compose exec mysql mysql -u acadpredict_user -pacadpredict_pass acadpredict_db -e "
SELECT id, name, email, role FROM users;
"
```
