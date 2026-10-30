# AI-AcadPredict — Role Access Matrix & Security Specification

This document provides the authoritative specification of user roles, authorization boundaries, account provisioning mechanisms, frontend route mappings, and backend security enforcement in **AI-AcadPredict**.

---

## 1. Verified Role Catalog & Architectural Findings

### A. System Roles vs. Project Responsibilities

The application maintains a strict separation between **System Authorization Roles** (which determine system privileges, API access, and navigation) and **Project Responsibilities** (which are contextual labels assigned to team members within a project):

- **System Authorization Roles:** Stored in `users.role` as an enum (`com.acadpredict.backend.entity.Role`). Evaluated by Spring Security filters (`hasRole()`, `hasAnyRole()`).
- **Project Responsibilities:** Stored in `project_members.role_in_project` as freeform text (e.g., `Team Lead`, `Firmware Engineer`, `Frontend Developer`, `Documentation Specialist`). These do not grant system-level permissions.

### B. Definite Absence of the `ADMIN` Role

| Candidate Role | In `Role.java` Enum? | In MySQL Enum? | Backend Handlers? | Frontend Route? | Status |
|---|---|---|---|---|---|
| **`STUDENT`** | **YES** | **YES** | **YES** | **YES** | Supported & Verified |
| **`FACULTY`** | **YES** | **YES** | **YES** | **YES** | Supported & Verified |
| **`COORDINATOR`** | **YES** | **YES** | **YES** | **YES** | Supported & Verified |
| **`ADMIN`** | **NO** | **NO** | **NO** | **NO** | **Does NOT exist in architecture** |

> [!NOTE]
> **Conclusion on `ADMIN`:**  
> The codebase does not declare an `ADMIN` role. Departmental oversight and administrative review are designed to be performed by the **`COORDINATOR`** role. No administrative screens or admin-specific API routes exist in the system, nor should any be fabricated. Any attempt to supply `ADMIN` as a role during user provisioning returns an immediate **HTTP 400 Bad Request**.

---

## 2. Configured Test Accounts & Provisioning Mechanisms

### A. Test Accounts Table

| Role | Account Email | Account Source | Password Setup Method | Login Verified | Available UI Modules |
|---|---|---|---|---|---|
| **`STUDENT`** | Dynamically registered (e.g. `ananya.student@college.edu`) | Public Registration (`POST /api/auth/register`) or Staff Provisioning (`POST /api/users`) | User entered at creation (BCrypt hashed) | **YES (HTTP 200)** | Dashboard, Proposal, Projects, Tasks, Team, Milestones, Documents, AI Risk, Notifications |
| **`FACULTY`** | `faculty@college.edu` | `DevAccountInitializer.java` / Coordinator Provisioning (`POST /api/users`) | `FacultyPass123!` (BCrypt hashed via `PasswordEncoder`) | **YES (HTTP 200)** | Faculty Dashboard, Global Project List, Proposal Review, Milestone Evaluation, Student Task Assignment, Add Students |
| **`COORDINATOR`** | `coordinator@college.edu` | `DevAccountInitializer.java` / Seed | `CoordinatorPass123!` (BCrypt hashed via `PasswordEncoder`) | **YES (HTTP 200)** | Coordinator Dashboard, Workload Overview, Guide Allocation, Proposal Review, Follow-Up Tracking, Add Users, Safe Deletion |

### B. Legitimate Account Provisioning Procedures

#### 1. Public Registration (Students Only)
- **Endpoint:** `POST /api/auth/register`
- **Behavior:** Accepts `name`, `email`, and `password`.
- **Security Rule:** Unconditionally sets `user.setRole(Role.STUDENT)`. Privileged roles cannot be self-assigned.

#### 2. Faculty Account Creation (`POST /api/users`)
- **Authorized Caller:** `FACULTY` role.
- **Allowed Target Role:** `STUDENT` only.
- **Security Enforcement:** If a faculty caller submits `FACULTY` or `COORDINATOR`, Spring backend rejects the request with **HTTP 403 Forbidden**.

#### 3. Coordinator Account Creation (`POST /api/users`)
- **Authorized Caller:** `COORDINATOR` role.
- **Allowed Target Roles:** `STUDENT` or `FACULTY`.
- **Security Enforcement:** If a coordinator caller submits `COORDINATOR` or `ADMIN`, the backend rejects with **HTTP 403 Forbidden** or **HTTP 400 Bad Request**.

#### 4. Local Development Seed (`DevAccountInitializer`)
- **Activation:** Controlled by Spring configuration `app.dev.provision-accounts=true` (`DEV_PROVISION_ACCOUNTS=true` in `docker-compose.yml`).
- **Safety Guarantees:**
  - Disabled by default in production.
  - Idempotent: Checks `userRepository.findByEmail(email).isEmpty()` before insertion; never duplicates or overwrites existing accounts.
  - Automatically encodes passwords with `BCryptPasswordEncoder` bean.

---

## 3. Frontend Route & Navigation Matrix

All authenticated users access the application through the unified modern layout (`StudentLayout.jsx`), but navigation controls, data visibility, and contextual action buttons adapt to the user's role:

| Frontend Route | Route Path | Student Access | Faculty Access | Coordinator Access | Notes |
|---|---|---|---|---|---|
| **Login / Register** | `/login`, `/register` | Public | Public | Public | Unauthenticated entry points |
| **Dashboard** | `/student/dashboard` | **YES** (Personal data) | **YES** (Supervision metrics & modals) | **YES** (Department oversight & analytics) | Adapts heading, metrics, action buttons, and modals per role |
| **Project Proposals** | `/student/proposal` | **YES** (Submit proposal & view review status) | **YES** (Review queue with feedback) | **YES** (Review queue with feedback) | Filterable tabs: *All*, *Pending Review*, *Approved*, *Rejected* |
| **My Projects** | `/student/projects` | **YES** (Owned projects only) | **YES** (Supervised & department projects) | **YES** (All departmental projects) | Includes Update Progress, Review Proposal, Assign Guide, Delete |
| **Tasks** | `/student/tasks` | **YES** (Owned projects) | **YES** (Any project) | **YES** (Any project) | Supports assignee selection from team members |
| **My Team** | `/student/team` | **YES** (Owned projects) | **YES** (Any project) | **YES** (Any project) | Add / view collaborators |
| **Milestones** | `/student/milestones` | **YES** (Owned projects) | **YES** (Any project) | **YES** (Any project) | Displays supervisor feedback & evaluation status |
| **Documents** | `/student/documents` | **YES** (Owned projects) | **YES** (Any project) | **YES** (Any project) | Upload, download, delete stored files on filesystem |
| **AI Risk Prediction** | `/student/risk` | **YES** (Owned projects) | **YES** (Any project) | **YES** (Any project) | Execute Random Forest prediction |
| **Notifications** | `/student/notifications` | **YES** | **YES** | **YES** | Static sample notifications (mock-data module) |

---

## 4. Backend Permission & Security Matrix

| API Endpoint | HTTP Method | Student Permission | Faculty Permission | Coordinator Permission | Unauthenticated Request |
|---|---|---|---|---|---|
| `/api/auth/register` | `POST` | **Allowed** (creates `STUDENT`) | N/A (creates `STUDENT`) | N/A (creates `STUDENT`) | **Allowed** |
| `/api/auth/login` | `POST` | **Allowed** (returns JWT) | **Allowed** (returns JWT) | **Allowed** (returns JWT) | **Allowed** |
| `/api/health` | `GET` | **Allowed** | **Allowed** | **Allowed** | **Allowed** |
| `/api/users` | `POST` | **FORBIDDEN (HTTP 403)** | **Allowed** (`STUDENT` only) | **Allowed** (`STUDENT` / `FACULTY`) | **HTTP 401 Unauthorized** |
| `/api/users/faculty` | `GET` | **Allowed** | **Allowed** | **Allowed** | **HTTP 401 Unauthorized** |
| `/api/users/students` | `GET` | **Allowed** | **Allowed** | **Allowed** | **HTTP 401 Unauthorized** |
| `/api/projects` | `GET` | **Allowed** (returns owned only) | **Allowed** (returns all projects) | **Allowed** (returns all projects) | **HTTP 401 Unauthorized** |
| `/api/projects` | `POST` | **Allowed** (creates project) | **Allowed** (creates project) | **Allowed** (creates project) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}` | `GET` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}` | `DELETE` | **Allowed** (owner only) | **Allowed** (assigned guide only) | **Allowed** (departmental scope) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/progress` | `PUT` | **Allowed** (owner only) | **Allowed** (assigned guide) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/assign-guide`| `PUT` | **FORBIDDEN (HTTP 403)** | **FORBIDDEN (HTTP 403)** | **Allowed** (assigns faculty guide) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/review` | `PUT` | **FORBIDDEN (HTTP 403)** | **Allowed** (`APPROVED`/`REJECTED` + feedback) | **Allowed** (`APPROVED`/`REJECTED` + feedback) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/follow-up` | `PUT` | **FORBIDDEN (HTTP 403)** | **FORBIDDEN (HTTP 403)** | **Allowed** (records tracking notes) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/tasks` | `GET`, `POST` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/tasks/{id}` | `PUT`, `DELETE` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/members` | `GET`, `POST` | **Allowed** (if owner) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/projects/{id}/milestones`| `GET`, `POST` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/milestones/{id}/review` | `PUT` | **FORBIDDEN (HTTP 403)** | **Allowed** (`REVIEWED`/`NEEDS_ATTENTION`) | **Allowed** (`REVIEWED`/`NEEDS_ATTENTION`) | **HTTP 401 Unauthorized** |
| `/api/documents/project/{id}` | `GET` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/documents/upload` | `POST` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/documents/{id}/download` | `GET` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/documents/{id}` | `DELETE` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/predictions/predict` | `POST` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |
| `/api/predictions/project/{id}`| `GET` | **Allowed** (if owner/member) | **Allowed** (any project) | **Allowed** (any project) | **HTTP 401 Unauthorized** |

---

## 5. Security & Authorization Verification Results

The automated integration and role security test suite (`scratch/verify_all_new_features.ps1`) was executed against the active Docker microservices with a **100% pass rate**:

1. **Test Case SEC-01 (Privilege Elevation Prevention via Public Registration):**
   - Public registration strictly assigns `STUDENT`.
2. **Test Case SEC-02 (Staff Account Creation Role Boundaries):**
   - Faculty successfully created `STUDENT` account (HTTP 201).
   - Faculty attempting to create `FACULTY` account was rejected with **HTTP 403 Forbidden**.
   - Coordinator successfully created `FACULTY` account (HTTP 201).
   - Any attempt to create `ADMIN` account was rejected with **HTTP 400 Bad Request**.
   - Students attempting to invoke `POST /api/users` were rejected with **HTTP 403 Forbidden**.
3. **Test Case SEC-03 (Duplicate Email Registration Rejection):**
   - Submitting an existing email to `POST /api/users` returned **HTTP 409 Conflict**.
4. **Test Case SEC-04 (Coordinator Faculty Guide Allocation):**
   - Coordinator assigned a registered Faculty account to a project (HTTP 200).
   - Attempting to assign a non-faculty account was rejected.
5. **Test Case SEC-05 (Proposal Review with Academic Feedback):**
   - Faculty reviewed proposal with `APPROVED` and persisted feedback comment.
   - Students attempting `PUT /api/projects/{id}/review` were rejected with **HTTP 403 Forbidden**.
6. **Test Case SEC-06 (Persistent Project Progress & Ownership Isolation):**
   - Student owner updated progress to 45% (HTTP 200); verified persisted in MySQL.
   - Non-owner student attempting to update progress received **HTTP 403 Forbidden**.
7. **Test Case SEC-07 (Milestone Evaluation & Academic Feedback):**
   - Faculty evaluated milestone with `REVIEWED` status and feedback note.
   - Students attempting `PUT /api/milestones/{id}/review` received **HTTP 403 Forbidden**.
8. **Test Case SEC-08 (Coordinator Follow-Up Tracking):**
   - Coordinator saved follow-up note; verified persisted with author and timestamp.
9. **Test Case SEC-09 (Safe Project Deletion Authorization & Cleanup):**
   - Unauthorized student attempting `DELETE /api/projects/{id}` received **HTTP 403 Forbidden**.
   - Owner student deleted project (HTTP 204); verified project removed (HTTP 404).
   - Associated disk files and child database entities were safely removed.
10. **Test Case SEC-10 (Cryptographic Hashing & Password Protection):**
    - All passwords in MySQL stored as BCrypt hashes (`$2a$10$...`). Zero plaintext passwords or secrets returned in responses.
