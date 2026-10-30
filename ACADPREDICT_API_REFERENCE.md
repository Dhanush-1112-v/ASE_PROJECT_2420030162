# AI-AcadPredict — Complete API Reference & Endpoint Specification

This document provides the exhaustive specification for all REST API endpoints across the **Spring Boot backend** (`:8081`) and the **Python FastAPI AI service** (`:8000`).

---

## 1. Global Architectural Conventions

### Base URLs
- **Spring Boot Backend:** `http://localhost:8081` (Internal Docker: `http://spring-backend:8081`)
- **FastAPI AI Service:** `http://localhost:8000` (Internal Docker: `http://ai-service:8000`)
- **Shared Frontend Base URL:** `/api` proxied to backend via Vite dev server or Docker Nginx.

### Authentication & Authorization Headers
Protected endpoints require an `Authorization` header with a valid Bearer token:
```http
Authorization: Bearer <jwt_token>
```
Tokens are issued upon successful registration or login and contain the user's ID, email subject, and authority role (`ROLE_STUDENT`, `ROLE_FACULTY`, or `ROLE_COORDINATOR`).

### Standard Error Response Format
Errors return a standard JSON payload:
```json
{
  "timestamp": "2026-10-28T10:00:00.000+00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied: Insufficient role permissions for this operation",
  "path": "/api/projects/12/review"
}
```

---

## 2. Authentication API (`/api/auth`)

### 1. User Registration
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth Required:** No (Public)
- **Allowed Roles:** Anyone (Always assigns `STUDENT`)
- **Request Body (`RegisterRequest`):**
```json
{
  "name": "Ananya Sharma",
  "email": "ananya.sharma@college.edu",
  "password": "SecurePassword123!"
}
```
- **Response (`201 Created` / `200 OK` - `AuthResponse`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "id": 14,
  "name": "Ananya Sharma",
  "email": "ananya.sharma@college.edu",
  "role": "STUDENT"
}
```
- **Error Codes:** `400 Bad Request` (Email already registered or validation failure).

### 2. User Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth Required:** No (Public)
- **Request Body (`LoginRequest`):**
```json
{
  "email": "ananya.sharma@college.edu",
  "password": "SecurePassword123!"
}
```
- **Response (`200 OK` - `AuthResponse`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "id": 14,
  "name": "Ananya Sharma",
  "email": "ananya.sharma@college.edu",
  "role": "STUDENT"
}
```
- **Error Codes:** `401 Unauthorized` (Bad credentials).

---

## 3. User Management API (`/api/users`)

### 1. Provision Account (Role-Gated)
- **Method:** `POST`
- **Path:** `/api/users`
- **Auth Required:** Yes
- **Allowed Roles:** `FACULTY` (can create `STUDENT` only), `COORDINATOR` (can create `STUDENT` or `FACULTY`)
- **Request Body (`CreateUserRequest`):**
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh.student@college.edu",
  "password": "InitialPass123!",
  "role": "STUDENT",
  "projectId": 12
}
```
*Note: `projectId` is optional. If provided, the created student is automatically added to the project's team members.*
- **Response (`201 Created` - `UserResponse`):**
```json
{
  "id": 18,
  "name": "Rajesh Kumar",
  "email": "rajesh.student@college.edu",
  "role": "STUDENT",
  "createdAt": "2026-10-28T10:05:00Z"
}
```
- **Error Codes:**
  - `400 Bad Request`: Validation failure or attempt to specify `ADMIN`.
  - `401 Unauthorized`: Unauthenticated request.
  - `403 Forbidden`: Student caller, or Faculty attempting to create a non-Student account, or Coordinator attempting to create a non-Student/non-Faculty account.
  - `409 Conflict`: Email already exists.

### 2. List Faculty Accounts
- **Method:** `GET`
- **Path:** `/api/users/faculty`
- **Auth Required:** Yes (Any authenticated user)
- **Response (`200 OK`):**
```json
[
  {
    "id": 2,
    "name": "Dr. Sharma",
    "email": "faculty@college.edu",
    "role": "FACULTY",
    "createdAt": "2026-10-27T10:00:00Z"
  }
]
```

### 3. List Student Accounts
- **Method:** `GET`
- **Path:** `/api/users/students`
- **Auth Required:** Yes (Any authenticated user)
- **Response (`200 OK`):** Array of `UserResponse` objects with role `STUDENT`.

---

## 4. Projects API (`/api/projects`)

### 1. Get Projects
- **Method:** `GET`
- **Path:** `/api/projects`
- **Auth Required:** Yes
- **Allowed Roles:** Any (`STUDENT` receives self-owned projects; `FACULTY` and `COORDINATOR` receive all department projects).
- **Response (`200 OK`):**
```json
[
  {
    "id": 12,
    "title": "Smart Campus IoT Energy Optimization",
    "domain": "Internet of Things",
    "description": "Smart sensor network for automated energy control",
    "objectives": "Reduce peak campus electricity consumption by 25%",
    "status": "APPROVED",
    "progress": 45,
    "facultyGuideId": 2,
    "facultyGuideName": "Dr. Sharma",
    "facultyGuideEmail": "faculty@college.edu",
    "reviewFeedback": "Solid architectural foundation. Proceed with sensor procurement.",
    "reviewedBy": "faculty@college.edu",
    "reviewedAt": "2026-10-28T09:30:00Z",
    "coordinatorNotes": "Mid-term evaluation slot confirmed for Nov 20.",
    "coordinatorNotesAuthor": "coordinator@college.edu",
    "coordinatorNotesUpdatedAt": "2026-10-28T09:45:00Z",
    "createdAt": "2026-10-27T12:00:00Z",
    "updatedAt": "2026-10-28T09:45:00Z",
    "owner": {
      "id": 14,
      "name": "Ananya Sharma",
      "email": "ananya.sharma@college.edu",
      "role": "STUDENT"
    }
  }
]
```

### 2. Create Project Proposal
- **Method:** `POST`
- **Path:** `/api/projects`
- **Auth Required:** Yes
- **Request Body (`ProjectRequest`):**
```json
{
  "title": "Smart Campus IoT Energy Optimization",
  "domain": "Internet of Things",
  "description": "Smart sensor network for automated energy control",
  "objectives": "Reduce peak campus electricity consumption by 25%"
}
```
- **Response (`201 Created` - `Project`):** Initialized with `status: "PROPOSED"`, `progress: 0`.

### 3. Update Project Progress
- **Method:** `PUT`
- **Path:** `/api/projects/{id}/progress`
- **Auth Required:** Yes
- **Allowed Roles:** Owner `STUDENT`, assigned `FACULTY` guide, or `COORDINATOR`.
- **Request Body:**
```json
{
  "progress": 55
}
```
- **Response (`200 OK` - `Project`):** Updated project object with persisted `progress: 55`.
- **Error Codes:** `400 Bad Request` (progress not between 0 and 100), `403 Forbidden` (non-owner student).

### 4. Review Proposal
- **Method:** `PUT`
- **Path:** `/api/projects/{id}/review`
- **Auth Required:** Yes
- **Allowed Roles:** `FACULTY`, `COORDINATOR`
- **Request Body (`ReviewRequest`):**
```json
{
  "status": "APPROVED",
  "feedback": "Proposal approved. Please set up the Git repository and begin Sprint 1."
}
```
- **Response (`200 OK` - `Project`):** Updated project with `status: "APPROVED"`, `reviewFeedback`, `reviewedBy`, and `reviewedAt`.
- **Error Codes:** `400 Bad Request` (Invalid status), `403 Forbidden` (Student caller).

### 5. Assign Faculty Guide
- **Method:** `PUT`
- **Path:** `/api/projects/{id}/assign-guide`
- **Auth Required:** Yes
- **Allowed Roles:** `COORDINATOR` only
- **Request Body:**
```json
{
  "facultyId": 2
}
```
- **Response (`200 OK` - `Project`):** Updated project with assigned `facultyGuide`.
- **Error Codes:** `400 Bad Request` (Target user is not FACULTY), `403 Forbidden` (Non-coordinator caller), `404 Not Found`.

### 6. Record Follow-Up Note
- **Method:** `PUT`
- **Path:** `/api/projects/{id}/follow-up`
- **Auth Required:** Yes
- **Allowed Roles:** `COORDINATOR` only
- **Request Body:**
```json
{
  "notes": "Student team is on schedule. Mid-term presentation slot confirmed for Nov 20."
}
```
- **Response (`200 OK` - `Project`):** Updated project with `coordinatorNotes`, author email, and update timestamp.
- **Error Codes:** `403 Forbidden` (Non-coordinator caller).

### 7. Delete Project (Safe Cascading)
- **Method:** `DELETE`
- **Path:** `/api/projects/{id}`
- **Auth Required:** Yes
- **Allowed Roles:** Project Owner (`STUDENT`), assigned `FACULTY` guide, or `COORDINATOR`.
- **Behavior:** Removes all uploaded files on the filesystem through `DocumentStorageService.deleteFile(...)` and deletes the project row and all associated database records (tasks, milestones, team members, predictions, documents).
- **Response (`204 No Content`)**
- **Error Codes:** `403 Forbidden` (Unauthorized student), `404 Not Found`.

---

## 5. Tasks API (`/api/projects/{id}/tasks` & `/api/tasks/{id}`)

### 1. Create Task
- **Method:** `POST`
- **Path:** `/api/projects/{projectId}/tasks`
- **Auth Required:** Yes
- **Request Body (`TaskRequest`):**
```json
{
  "title": "Hardware Specification",
  "description": "Select microcontroller and wireless transceivers",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-11-10",
  "assignedToId": 18
}
```
- **Response (`201 Created` - `TaskResponse`):**
```json
{
  "id": 101,
  "projectId": 12,
  "title": "Hardware Specification",
  "description": "Select microcontroller and wireless transceivers",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-11-10",
  "assignedToId": 18,
  "assignedToName": "Rajesh Kumar",
  "createdAt": "2026-10-28T10:10:00Z"
}
```

### 2. Update Task
- **Method:** `PUT`
- **Path:** `/api/tasks/{id}`
- **Auth Required:** Yes
- **Request Body (`TaskRequest`):** Same as create task. Supports updating assignee (`assignedToId`), priority, status, and due date.
- **Response (`200 OK` - `TaskResponse`).**

### 3. Delete Task
- **Method:** `DELETE`
- **Path:** `/api/tasks/{id}`
- **Auth Required:** Yes
- **Response (`204 No Content`).**

---

## 6. Milestones API (`/api/projects/{id}/milestones` & `/api/milestones/{id}`)

### 1. Create Milestone
- **Method:** `POST`
- **Path:** `/api/projects/{projectId}/milestones`
- **Auth Required:** Yes
- **Request Body (`MilestoneRequest`):**
```json
{
  "title": "System Architecture Review",
  "description": "UML diagrams, database schema, and interface contracts",
  "dueDate": "2026-11-15",
  "status": "IN_PROGRESS",
  "completion": 50
}
```
- **Response (`201 Created` - `MilestoneResponse`).**

### 2. Milestone Evaluation & Academic Feedback
- **Method:** `PUT`
- **Path:** `/api/milestones/{id}/review`
- **Auth Required:** Yes
- **Allowed Roles:** `FACULTY`, `COORDINATOR`
- **Request Body:**
```json
{
  "reviewStatus": "REVIEWED",
  "reviewFeedback": "Architecture diagrams meet department standards. Approved to start coding."
}
```
*Supported `reviewStatus` values: `PENDING_REVIEW`, `REVIEWED`, `NEEDS_ATTENTION`.*
- **Response (`200 OK` - `MilestoneResponse`):** Updated milestone with review status, academic feedback, reviewer name, and review timestamp.
- **Error Codes:** `403 Forbidden` (Student caller).

---

## 7. Documents API (`/api/documents`)

### 1. Upload Document
- **Method:** `POST`
- **Path:** `/api/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: Binary file (e.g. PDF, DOCX, ZIP)
  - `projectId`: Target project ID
- **Storage Strategy:** Stores file bytes on persistent host/container filesystem (`/app/uploads/` via Docker volume `document_uploads`). Stores metadata in MySQL `documents` table.
- **Response (`201 Created` - `DocumentResponse`).**

### 2. Authenticated Document Download
- **Method:** `GET`
- **Path:** `/api/documents/{id}/download`
- **Auth Required:** Yes
- **Response:** Binary file stream with `Content-Disposition: attachment; filename="..."`.

### 3. Delete Document
- **Method:** `DELETE`
- **Path:** `/api/documents/{id}`
- **Auth Required:** Yes
- **Behavior:** Deletes file from filesystem and removes metadata row from MySQL.
- **Response (`204 No Content`).**

---

## 8. AI Delay Risk Prediction API (`/api/predictions`)

### 1. Execute AI Prediction
- **Method:** `POST`
- **Path:** `/api/predictions/predict`
- **Auth Required:** Yes
- **Request Body (`PredictionRequest`):**
```json
{
  "projectId": 12,
  "teamSize": 4,
  "totalTasks": 25,
  "completedTasks": 10,
  "delayedTasks": 3,
  "milestonesTotal": 4,
  "milestonesAchieved": 1,
  "codeCommitsCount": 85,
  "pullRequestsCount": 12,
  "documentCount": 3,
  "teamVelocity": 1.8,
  "facultyMeetingCount": 6
}
```
- **Response (`200 OK` - `PredictionResponse`):**
```json
{
  "id": 10,
  "projectId": 12,
  "riskLevel": "HIGH",
  "delayProbability": 0.78,
  "predictedDelayDays": 14.5,
  "confidenceScore": 0.85,
  "recommendations": [
    "High task backlog detected. Reassign overdue tasks to parallel tracks.",
    "Schedule an urgent faculty review meeting to mitigate review bottleneck."
  ],
  "createdAt": "2026-10-28T10:15:00Z"
}
```

### 2. Get Project Prediction History
- **Method:** `GET`
- **Path:** `/api/predictions/project/{projectId}`
- **Auth Required:** Yes
- **Response (`200 OK`):** Array of historical predictions for this project.

---

## 9. AI FastAPI Direct Endpoints (`:8000`)

### 1. Health Status
- **Method:** `GET`
- **Path:** `/health`
- **Response (`200 OK`):** `{"status": "healthy", "model_loaded": true, "model_version": "1.0.0"}`

### 2. Direct Model Inference
- **Method:** `POST`
- **Path:** `/predict`
- **Payload:** 11 numeric features.
- **Response (`200 OK`):** `{"risk_level": "HIGH", "delay_probability": 0.78, "predicted_delay_days": 14.5}`
