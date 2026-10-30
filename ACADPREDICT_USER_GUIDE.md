# AI-AcadPredict — User Guide & Operational Manual

**Platform:** AI-Integrated Academic Project Management & Delay Risk Prediction Platform  
**Target Audience:** Students, Project Team Leads, Faculty Supervisors, Project Coordinators, and External Examiners.

---

## 1. System Overview & Technology Stack

AI-AcadPredict is an end-to-end academic project lifecycle management and AI-assisted delay risk prediction platform designed for universities. It replaces fragmented spreadsheets and ad-hoc task tracking with a centralized, role-governed web application.

- **Frontend:** React 19 + Vite (Single Page Application, Vanilla CSS design tokens, dynamic metrics and charts)
- **Backend:** Spring Boot 3.3.4 (Java 21, Spring Security, JWT Authentication, Spring Data JPA)
- **Database:** MySQL 8.0 (persistent relational storage via Docker volume `mysql_data`)
- **Document Store:** Host/container filesystem storage (persistent volume `document_uploads`)
- **AI Prediction Microservice:** Python FastAPI (scikit-learn Random Forest regression model evaluating 11 academic project metrics)
- **Orchestration:** Docker Compose multi-container deployment

---

## 2. Prerequisites & Requirements

Before starting the application, ensure the host machine meets the following criteria:

### Required Software
1. **Docker Desktop** (version 24.0+ recommended) with Docker Compose v2.
   - Ensure the Docker daemon is active and running (e.g. green status in Docker Desktop).
2. **Web Browser:** Modern browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari).

### Local Development Optional (Only if running outside Docker):
- **JDK 21** & **Apache Maven 3.9+** (for `spring-backend`)
- **Node.js 20+** & **npm 10+** (for `frontend`)
- **Python 3.10+** with `pip` (for `ai-service`)
- **MySQL Server 8.0**

---

## 3. Starting and Stopping the Platform

All services run together via Docker Compose. The repository root contains the pre-configured [docker-compose.yml](file:///d:/KLH-Y3-ODD-SEM/ASE/ASE%20Project/AcadPredict/docker-compose.yml).

### A. First-Time Setup & Starting Services

Open PowerShell or a terminal in the project root:

```powershell
# 1. Validate Docker Compose configuration
docker compose config -q

# 2. Build and start all 4 containers in detached mode
docker compose up -d --build

# 3. Check container status
docker compose ps
```

Expected output of `docker compose ps`:
```text
NAME                         IMAGE               COMMAND                  SERVICE             CREATED         STATUS                   PORTS
acadpredict-ai-service       ...                 "uvicorn app.main:app…"  ai-service          ...             Up (healthy)             0.0.0.0:8000->8000/tcp
acadpredict-frontend         ...                 "/docker-entrypoint.…"   frontend            ...             Up                       0.0.0.0:5173->80/tcp
acadpredict-mysql            mysql:8.0           "docker-entrypoint.s…"   mysql               ...             Up (healthy)             0.0.0.0:3307->3306/tcp
acadpredict-spring-backend   ...                 "java -Djava.securit…"   spring-backend      ...             Up (healthy)             0.0.0.0:8081->8081/tcp
```

### B. Health Checks & Verification URLs

Verify that the microservices are healthy by opening the following endpoints:

| Service | Browser / Host URL | Internal Docker URL | Purpose |
|---|---|---|---|
| **Frontend UI** | `http://localhost:5173` | N/A (Client Browser) | Web Dashboard & User Portal |
| **Backend Health** | `http://localhost:8081/api/health` | `http://spring-backend:8081/api/health` | Spring Boot + DB Connectivity |
| **AI Microservice Health** | `http://localhost:8000/health` | `http://ai-service:8000/health` | FastAPI & Model Status |
| **AI OpenAPI / Swagger** | `http://localhost:8000/docs` | N/A | Interactive API documentation |
| **MySQL Database** | `localhost:3307` | `mysql:3306` | MySQL Port 3306 mapped to 3307 |

### C. Viewing Logs

```powershell
# View recent logs from all services:
docker compose logs --tail=100

# Inspect specific container logs:
docker compose logs -f spring-backend
docker compose logs -f ai-service
docker compose logs -f frontend
```

### D. Safe Stopping & Restarting

```powershell
# Safe shutdown (preserves database records and uploaded files):
docker compose down

# SAFE Restart:
docker compose restart

# WARNING: NEVER run 'docker compose down -v' unless you explicitly want
# to destroy the MySQL database volume and all stored documents!
```

---

## 4. Supported User Roles & Account Provisioning

The system enforces strict role-based access control (RBAC). Only **three** user roles exist in the architecture:

| Role | Intended User | Scope & Capabilities | Legitimate Provisioning Method |
|---|---|---|---|
| **`STUDENT`** | Undergraduate / Postgraduate students | Create & manage self-owned projects, update progress, manage tasks, assign team members, manage milestones, upload documents, run AI predictions. Cannot review proposals or provision accounts. | **1. Public Registration:** Register directly via `http://localhost:5173/register`.<br>**2. Staff Provisioning:** Created by Faculty or Coordinator via Dashboard "+ Add Student" modal. |
| **`FACULTY`** | Project Guides / Academic Supervisors | View assigned/supervised projects and department review queue, review proposals with academic feedback, evaluate milestones, assign project tasks, create Student accounts. | **1. Coordinator Provisioning:** Created by Coordinator via Dashboard "+ Add User Account" modal (`POST /api/users`).<br>**2. Dev Seeder:** Pre-configured via `DEV_PROVISION_ACCOUNTS=true`. |
| **`COORDINATOR`** | Department Academic Coordinator / HOD | Department-wide oversight across all student teams, review proposals, allocate/reassign faculty guides, monitor faculty workload, record follow-up notes, create Student and Faculty accounts, delete projects. | **1. Dev Seeder:** Pre-configured via `DEV_PROVISION_ACCOUNTS=true`.<br>**2. Institutional DBA:** Safe initial insertion in MySQL `users` table. |

> [!IMPORTANT]
> **Does an `ADMIN` role exist?**  
> **NO.** The system architecture intentionally defines only `STUDENT`, `FACULTY`, and `COORDINATOR` in the `Role` enum. There is no `ADMIN` role, nor is one allowed. All administrative and departmental oversight is handled by `COORDINATOR`.

### Pre-Configured Test Accounts (via `DEV_PROVISION_ACCOUNTS=true`)

When Docker Compose runs with development provisioning enabled, the following test accounts are idempotently provisioned with secure BCrypt password hashes:

| Role | Email | Password | Display Name | Permissions |
|---|---|---|---|---|
| **`FACULTY`** | `faculty@college.edu` | `FacultyPass123!` | Dr. Sharma | Supervision view, Proposal Review, Milestone Evaluation, Add Students |
| **`COORDINATOR`** | `coordinator@college.edu` | `CoordinatorPass123!` | Prof. Williams | Departmental view, Guide Allocation, Workload Overview, Follow-Up, Add Staff |
| **`STUDENT`** | Any new email via `/register` | User chosen | User chosen | Strict ownership of self-created projects |

---

## 5. Differentiated Role Dashboards

When logging in, the dashboard dynamically alters its heading, metrics, action buttons, and workflows based on the authenticated user's role:

### A. Student Dashboard
- **Heading:** `Student Dashboard`
- **Genuine Metrics:** Personal Active Projects count, Task Completion Percentage, Upcoming Milestones, and Genuine High Delay Risk Projects.
- **Workflow Highlights:**
  - Submit new proposals.
  - Quick action to view and update tasks.
  - Project milestone deadlines and direct progress indicators.

### B. Faculty Dashboard
- **Heading:** `Faculty Dashboard`
- **Supervision Focus:** Built specifically for academic project supervisors.
- **5 Genuine Backend Metrics:**
  1. *Assigned / Supervised Projects:* Projects where the faculty member is the designated guide.
  2. *Proposals Pending Review:* Department proposals awaiting review.
  3. *Upcoming Milestones:* Supervised project milestones due in the future.
  4. *Overdue Milestones:* Supervised project milestones past due date and incomplete.
  5. *High Delay Risk Projects:* Genuine predictions reporting HIGH risk on supervised projects.
- **Action Capabilities:**
  - **Supervisor Feedback & Milestone Review:** Inspect and record academic feedback on milestones (`PENDING_REVIEW`, `REVIEWED`, `NEEDS_ATTENTION`).
  - **Assign Student to Task:** Select project team members and assign them to specific project tasks.
  - **+ Add Student Account:** Create student accounts with institutional email and initial password.
  - **Review Queue:** Direct access to review proposals with feedback comments.

### C. Coordinator Dashboard
- **Heading:** `Coordinator Dashboard`
- **Departmental Oversight Focus:** Built for managing the entire department's academic project portfolio.
- **7 Genuine Backend Metrics:**
  1. *Total Projects:* Complete count of student projects across the department.
  2. *Awaiting Review:* Projects submitted and pending evaluation.
  3. *Approved Projects:* Projects formally approved.
  4. *Rejected Projects:* Projects rejected during review.
  5. *Unassigned Projects:* Projects without an assigned faculty guide.
  6. *Overdue Milestones:* Overdue milestones across all department projects.
  7. *High Delay Risk:* Projects flagged with HIGH delay risk across the department.
- **Action Capabilities:**
  - **Faculty Workload Overview:** Interactive table summarizing faculty project allocations, pending reviews, overdue milestones, and high-risk counts.
  - **Department Review History & Follow-Up:** Timeline of review decisions, reviewers, timestamps, and persistent coordinator follow-up notes.
  - **Faculty Guide Allocation:** Assign or reassign faculty guides to student projects.
  - **+ Add User Account:** Create either `STUDENT` or `FACULTY` accounts.

---

## 6. End-to-End Workflow Walkthroughs

### Workflow 1: Student Project Lifecycle
1. **Register / Login:** Register at `/register` or log in as a student.
2. **Submit Proposal:** Go to **Proposal** (`/student/proposal`), enter project title, domain, description, objectives, and submit.
3. **Check Review Status:** View proposal status (`PROPOSED`, `APPROVED`, `REJECTED`) and read reviewer feedback comments.
4. **Update Project Progress:** In **My Projects** (`/student/projects`), click **Update Progress** on your project card. Use the 0–100% slider and click **Save Progress**. Progress is saved directly in MySQL and updates instantly across all views.
5. **Manage Tasks:** Create tasks in **Tasks** (`/student/tasks`), set priority, due dates, and select assignees from your project team.
6. **Track Milestones:** Create milestones in **Milestones** (`/student/milestones`). Review feedback and evaluation status (`REVIEWED` / `NEEDS_ATTENTION`) from your supervisor will appear here.
7. **Upload Documents:** Upload SRS, design specs, or code files in **Documents** (`/student/documents`). Files are saved on disk and metadata in MySQL.
8. **Run AI Prediction:** In **Risk Prediction** (`/student/prediction`), run the AI Random Forest model to calculate delay probability, predicted delay days, and risk level (`LOW`, `MEDIUM`, `HIGH`).
9. **Delete Project (Safe Confirmation):** In **My Projects**, click **Delete Project**. In the confirmation modal, type the exact project title and confirm. The system cleans up all disk files and database records.

### Workflow 2: Faculty Supervision & User Creation
1. **Login as Faculty:** `faculty@college.edu` / `FacultyPass123!`.
2. **Create Student Account:** On the Faculty Dashboard, click **+ Add Student Account**. Fill in Student Name, institutional email, password, and click **Create Student Account**.
3. **Review Proposals:** Go to **Proposal** or click **Pending Review** in My Projects. Click **Review Proposal**, select `APPROVED` or `REJECTED`, type academic review feedback, and submit.
4. **Evaluate Milestones:** Click **Supervisor Feedback** on the Faculty Dashboard or navigate to project milestones. Set milestone status to `REVIEWED` or `NEEDS_ATTENTION`, add feedback notes, and save.
5. **Assign Tasks to Students:** Click **Assign Student to Task**, choose an authorized project, select a team member from the dropdown, pick the task, and save the assignment.

### Workflow 3: Coordinator Allocation, Workload & Follow-Up
1. **Login as Coordinator:** `coordinator@college.edu` / `CoordinatorPass123!`.
2. **Create Faculty or Student Account:** On the Coordinator Dashboard, click **+ Add User Account**. Choose Role (`STUDENT` or `FACULTY`), fill in credentials, and submit.
3. **Faculty Workload Overview:** View the live table of faculty members and their supervised project metrics. Identify unassigned projects.
4. **Assign Faculty Guide:** In **My Projects**, click **Assign Guide** on any project. Select an active Faculty member from the dropdown and save. The project is immediately allocated to that supervisor.
5. **Record Follow-Up Notes:** In the Department Review History modal, click **Add / Edit Follow-Up Note**. Enter tracking notes (e.g. "Scheduled for mid-term review Nov 20") and save.

---

## 7. Security & Authorization Enforcement

The application enforces security at both the Spring Security filter chain and domain service layers:

1. **Role-Gated User Creation (`POST /api/users`):**
   - Faculty can only create `STUDENT` accounts (attempting `FACULTY` returns 403).
   - Coordinator can create `STUDENT` and `FACULTY` accounts.
   - Public registration strictly assigns `STUDENT`.
   - Creating `ADMIN` accounts is strictly forbidden across all endpoints.
2. **Review Protection (HTTP 403 Forbidden):**
   - Students cannot review proposals or milestones.
3. **Cross-Student Project Isolation (HTTP 403 Forbidden):**
   - Students cannot view, edit progress, or delete projects owned by other students.
4. **Faculty Guide Allocation Control:**
   - Only `COORDINATOR` can assign or reassign faculty guides.
5. **Secure Cryptographic Hashing:**
   - All passwords in MySQL are stored as one-way BCrypt hashes (`$2a$10$...`). Plaintext passwords and JWT signing secrets are never exposed in API responses or database tables.

---

## 8. Database Inspection & Verification Guide

Connect to the database container using Docker:

```powershell
docker compose exec mysql mysql -u acadpredict_user -pacadpredict_pass acadpredict_db
```

### Verification Queries:

```sql
-- 1. Inspect registered users, roles, and creation
SELECT id, name, email, role, created_at FROM users;

-- 2. Inspect projects, assigned guides, progress, and review feedback
SELECT p.id, p.title, p.status, p.progress, u.name AS owner_name, 
       fg.name AS faculty_guide, p.review_feedback, p.reviewed_by 
FROM projects p 
JOIN users u ON p.owner_id = u.id 
LEFT JOIN users fg ON p.faculty_guide_id = fg.id;

-- 3. Inspect coordinator follow-up notes
SELECT id, title, coordinator_notes, coordinator_notes_author, coordinator_notes_updated_at 
FROM projects WHERE coordinator_notes IS NOT NULL;

-- 4. Inspect milestone evaluation statuses and feedback
SELECT id, title, status, review_status, review_feedback, reviewed_by, reviewed_at 
FROM milestones;

-- 5. Inspect tasks and student assignees
SELECT t.id, t.title, t.status, t.priority, t.project_id, u.name AS assigned_to 
FROM tasks t 
LEFT JOIN users u ON t.assigned_to_id = u.id;

-- 6. Inspect stored documents on filesystem
SELECT id, original_filename, content_type, file_size, storage_path, project_id 
FROM documents;
```

---

## 9. Troubleshooting & FAQ

### Q1: The frontend shows "Failed to fetch" or Network Error.
- **Cause:** The Spring Boot backend container is still starting up or MySQL is initializing.
- **Fix:** Check `docker compose ps`. Wait until `acadpredict-spring-backend` reports `(healthy)`. You can monitor initialization via `docker compose logs -f spring-backend`.

### Q2: AI Prediction fails or reports 500 error.
- **Cause:** The `ai-service` container may be unreachable.
- **Fix:** Visit `http://localhost:8000/health` in your browser. Verify that the response is `{"status":"healthy","model_loaded":true}`.

### Q3: How do I safely stop the application without losing my data?
```powershell
docker compose down
```
*(This halts the containers while preserving your MySQL data and uploaded documents).*
