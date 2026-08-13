# AcadPredict

## AI-Integrated Adaptive Academic Project Collaboration and Risk Prediction Platform

---

# Team Members

| Name               | Student ID |
| ------------------ | ---------- |
| R.L.S.Giridhar     | 2420030171 |
| B.Srihitha         | 2420030099 |
| V.Sai Dhanush      | 2420030162 |
| V.Mani MahaLakshmi | 2420030773 |

---

# Supervisor

**Supervisor Name:** Dr. G. LAVANYA

---

# Abstract

Academic project collaboration often faces challenges such as fragmented communication, manual progress tracking, uneven faculty workload, and delayed project completion. Existing systems primarily focus on basic project management and lack intelligent risk prediction and adaptive workflow capabilities. This project proposes **AcadPredict**, an AI-integrated adaptive academic project collaboration platform that combines machine learning with rule-based workflow adaptation. The system predicts project delay risk using project activity data and automatically triggers notifications, escalations, and review scheduling actions. The platform is developed using React.js, Spring Boot, MySQL, Python, FastAPI, Docker, and Kubernetes. The proposed solution aims to improve project monitoring, collaboration, timely intervention, and overall academic project success.

---

# Project Objectives

* Provide a centralized platform for academic project collaboration.
* Enable efficient communication among students, faculty, and coordinators.
* Predict project delay risks using machine learning.
* Automate workflow adaptation through predefined rules.
* Improve project monitoring and reporting.
* Reduce manual administrative effort.
* Support secure and scalable application deployment.

---

# User Roles

## Student

* Register and log in.
* Submit project proposals.
* Create or join project teams.
* Upload project documents.
* Update tasks and milestones.
* View project progress.
* Receive notifications.

## Faculty Guide

* Review project proposals.
* Approve or reject submissions.
* Assign milestones.
* Provide feedback.
* Monitor team progress.
* View project risk predictions.

## Project Coordinator

* Create project batches.
* Assign faculty guides.
* Monitor all projects.
* Generate reports.
* Manage users and schedules.
* Receive escalation alerts.

---

# AI Integration

## AI Objective

Predict the risk of project delays and enable early intervention.

### Input Features (X)

* Attendance Percentage
* Task Completion Percentage
* Number of Pending Tasks
* Number of Missed Deadlines
* Milestone Completion Percentage
* Study/Activity Hours
* Previous Academic Performance

### Output (Y)

**Project Delay Risk**

* Low Risk
* Medium Risk
* High Risk

### Workflow

```text
Project Data
      ↓
Data Preprocessing
      ↓
Machine Learning Model
      ↓
Risk Prediction
      ↓
Adaptive Rule Engine
      ↓
Notifications / Escalations / Review Scheduling
```

---

# Technology Stack

| Component        | Technology         |
| ---------------- | ------------------ |
| Frontend         | React.js           |
| Backend          | Spring Boot (Java) |
| Database         | MySQL              |
| Authentication   | JWT                |
| AI/ML            | Python             |
| ML Library       | Scikit-learn       |
| ML Algorithm     | Random Forest      |
| AI API           | FastAPI            |
| Version Control  | Git                |
| Repository       | GitHub             |
| CI/CD            | GitHub Actions     |
| Containerization | Docker             |
| Orchestration    | Kubernetes         |
| Local Cluster    | Minikube           |
| Monitoring       | Prometheus         |
| Visualization    | Grafana            |
| Security Testing | OWASP ZAP          |
| Agile Tool       | Jira               |

---

# Mandatory Folder Structure

```text
AcadPredict/
│
├── README.md
│
├── src/
│   ├── frontend/
│   ├── backend/
│   ├── ai-service/
│   └── database/
│
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── user-stories/
│   └── sprint-documents/
│
├── data/
│   ├── datasets/
│   └── dataset-references.md
│
├── results/
│   ├── model-results/
│   ├── screenshots/
│   └── evaluation-results/
│
└── reports/
    ├── sprint-reports/
    ├── progress-reports/
    └── final-report/
```

---

# Setup Instructions

## Prerequisites

* Java JDK 17+
* Node.js
* MySQL Server
* Python 3.x
* Git
* Docker (Optional)
* Minikube (Optional)

## Planned Setup Process

1. Clone the repository.
2. Configure MySQL database.
3. Configure Spring Boot backend.
4. Install React dependencies.
5. Configure Python AI service.
6. Start backend services.
7. Start frontend application.
8. Access the system through a web browser.

---

# Execution Instructions

## Backend

```bash
cd backend
mvn spring-boot:run
```

## Frontend

```bash
cd frontend
npm install
npm start
```

## AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

---

# Agile Development Approach

The project follows the **Scrum Framework**.

### Scrum Activities

* Product Backlog
* Sprint Planning
* Sprint Development
* Daily Scrum
* Sprint Review
* Sprint Retrospective

### Agile Tool

**Jira** is used for:

* User Stories
* Story Point Estimation
* Sprint Planning
* Backlog Management
* Progress Tracking

---

# Current Phase Status

## Phase

**Requirements Analysis and Product Backlog Preparation**

## Completed

* Project title finalized.
* Project objectives identified.
* User roles identified.
* Functional requirements identified.
* AI integration finalized.
* User stories created.
* Story point estimation completed.
* User stories entered into Jira.
* Initial Scrum backlog prepared.

## In Progress

* Requirement refinement.
* Sprint planning.
* System architecture design.
* Database design.

## Not Yet Started

* Frontend development.
* Backend development.
* AI model implementation.
* API integration.
* Testing.
* Docker deployment.
* Kubernetes deployment.
* Monitoring setup.
* Security testing.

---

# Dataset Information

The project will use publicly available educational datasets for machine-learning model development and evaluation.

Potential sources include:

* UCI Student Performance Dataset
* UCI Predict Students' Dropout and Academic Success Dataset
* Kaggle Student Performance Factors Dataset

These datasets will be used to train and evaluate the project delay-risk prediction model.

---

# Evaluation Metrics

## AI Model Metrics

* Accuracy
* Precision
* Recall
* F1-Score
* Confusion Matrix

## System Metrics

* Response Time
* Reliability
* Usability
* User Satisfaction
* Workflow Adaptation Effectiveness

---

# Expected Outcomes

* Improved academic project collaboration.
* Early identification of project delays.
* Better faculty workload distribution.
* Automated adaptive workflow management.
* Enhanced project monitoring and reporting.
* Secure and scalable application deployment.
* Improved project completion rates.

---

# Project Status Summary

**Current Status:** Requirements Analysis Phase

**Jira Progress:** User Stories and Story Point Estimation Completed

**Implementation Status:** Not Started

**AI Model Status:** Not Started

**Testing Status:** Not Started

**Deployment Status:** Not Started

---

© 2026 AcadPredict Team
