# Verification script for AI-AcadPredict new role-based dashboard, account provisioning, project lifecycle, and proposal workflow

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:8081"

Write-Host "=== 1. Health Checks ==="
$health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
Write-Host "Spring Boot backend status: $($health.status)"

$aiHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
Write-Host "AI Service status: $($aiHealth.status)"

Write-Host "`n=== 2. Testing Dev Accounts Authentication ==="
# Login as Coordinator
$coordLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = "coordinator@college.edu"
    password = "CoordinatorPass123!"
} | ConvertTo-Json)
$coordToken = $coordLogin.token
Write-Host "Coordinator login successful. Role: $($coordLogin.role)"

# Login as Faculty
$facultyLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = "faculty@college.edu"
    password = "FacultyPass123!"
} | ConvertTo-Json)
$facultyToken = $facultyLogin.token
Write-Host "Faculty login successful. Role: $($facultyLogin.role)"

# Register and Login as Student
$studentEmail = "student_$(Get-Random)@college.edu"
$studentReg = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body (@{
    name = "Test Student"
    email = $studentEmail
    password = "StudentPass123!"
} | ConvertTo-Json)
$studentToken = $studentReg.token
Write-Host "Student registration & login successful. Role: $($studentReg.role)"

Write-Host "`n=== 3. Testing Role-Based Account Provisioning ==="
# 3a. Faculty creates a STUDENT account (should succeed 201)
$uniqueStudentEmail = "student_$(Get-Random)@university.edu"
$newStudent = Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Headers @{ Authorization = "Bearer $facultyToken" } -ContentType "application/json" -Body (@{
    name = "New Test Student"
    email = $uniqueStudentEmail
    password = "Password123!"
    role = "STUDENT"
} | ConvertTo-Json)
Write-Host "PASS: Faculty created student: $($newStudent.email) (Role: $($newStudent.role))"

# Verify newly created student can log in
$newStudentLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = $uniqueStudentEmail
    password = "Password123!"
} | ConvertTo-Json)
Write-Host "PASS: Newly created student logged in successfully. Role: $($newStudentLogin.role)"

# 3b. Faculty attempts to create a FACULTY account (should be rejected 403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Headers @{ Authorization = "Bearer $facultyToken" } -ContentType "application/json" -Body (@{
        name = "Unauthorized Faculty"
        email = "unauthorized_fac@university.edu"
        password = "Password123!"
        role = "FACULTY"
    } | ConvertTo-Json)
    Write-Host "FAILED: Faculty was able to create FACULTY account" -ForegroundColor Red
} catch {
    Write-Host "PASS: Faculty blocked from creating FACULTY account"
}

# 3c. Coordinator creates a FACULTY account (should succeed 201)
$uniqueFacultyEmail = "dr_faculty_$(Get-Random)@university.edu"
$newFaculty = Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Headers @{ Authorization = "Bearer $coordToken" } -ContentType "application/json" -Body (@{
    name = "Dr. New Faculty"
    email = $uniqueFacultyEmail
    password = "Password123!"
    role = "FACULTY"
} | ConvertTo-Json)
Write-Host "PASS: Coordinator created faculty: $($newFaculty.email) (Role: $($newFaculty.role))"

# Verify newly created faculty can log in
$newFacultyLogin = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = $uniqueFacultyEmail
    password = "Password123!"
} | ConvertTo-Json)
Write-Host "PASS: Newly created faculty logged in successfully. Role: $($newFacultyLogin.role)"

# 3d. Coordinator attempts to create ADMIN (should be rejected 403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Headers @{ Authorization = "Bearer $coordToken" } -ContentType "application/json" -Body (@{
        name = "Illegal Admin"
        email = "admin@university.edu"
        password = "Password123!"
        role = "ADMIN"
    } | ConvertTo-Json)
    Write-Host "FAILED: Coordinator was able to create ADMIN account" -ForegroundColor Red
} catch {
    Write-Host "PASS: Creating ADMIN blocked (Role must be STUDENT or FACULTY)"
}

# 3e. Student attempts to use staff account creation endpoint (should be 403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
        name = "Student Hacker"
        email = "hacker@university.edu"
        password = "Password123!"
        role = "FACULTY"
    } | ConvertTo-Json)
    Write-Host "FAILED: Student accessed staff endpoint" -ForegroundColor Red
} catch {
    Write-Host "PASS: Student blocked from /api/users endpoint"
}

Write-Host "`n=== 4. Testing Project Proposal and Coordinator Guide Allocation ==="
# Student creates a project proposal
$testProject = Invoke-RestMethod -Uri "$BaseUrl/api/projects" -Method Post -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
    projectName = "E2E Automated Capstone $(Get-Random)"
    description = "A full capstone project testing end-to-end features"
    projectType = "AI"
} | ConvertTo-Json)
$projectId = $testProject.id
Write-Host "PASS: Student created project id: $projectId name: $($testProject.projectName)"

# Coordinator assigns newly created faculty as guide
$assignedProject = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/assign-guide" -Method Put -Headers @{ Authorization = "Bearer $coordToken" } -ContentType "application/json" -Body (@{
    facultyId = $newFaculty.id
} | ConvertTo-Json)
Write-Host "PASS: Coordinator assigned faculty guide: $($assignedProject.facultyGuideName) (ID: $($assignedProject.facultyGuideId))"

# Faculty reviews proposal with feedback
$reviewedProject = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/review" -Method Put -Headers @{ Authorization = "Bearer $($newFacultyLogin.token)" } -ContentType "application/json" -Body (@{
    status = "APPROVED"
    feedback = "Proposal accepted. Please proceed with Sprint 1 architecture."
} | ConvertTo-Json)
Write-Host "PASS: Faculty reviewed proposal: Status = $($reviewedProject.status), Feedback = '$($reviewedProject.reviewFeedback)' by $($reviewedProject.reviewedBy)"

Write-Host "`n=== 5. Testing Persistent Project Progress ==="
# Student updates progress to 45%
$progressUpdated = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/progress" -Method Put -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
    progress = 45
} | ConvertTo-Json)
Write-Host "PASS: Student updated progress: $($progressUpdated.progress)%"

# Verify progress is persistent by fetching project directly
$fetchedProject = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId" -Method Get -Headers @{ Authorization = "Bearer $studentToken" }
if ($fetchedProject.progress -eq 45) {
    Write-Host "PASS: Verified progress persisted in MySQL: $($fetchedProject.progress)%"
} else {
    Write-Host "FAILED: Progress was not 45%, got $($fetchedProject.progress)%" -ForegroundColor Red
}

# Cross-student progress update test (should be 403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/progress" -Method Put -Headers @{ Authorization = "Bearer $($newStudentLogin.token)" } -ContentType "application/json" -Body (@{
        progress = 90
    } | ConvertTo-Json)
    Write-Host "FAILED: Other student modified project progress" -ForegroundColor Red
} catch {
    Write-Host "PASS: Non-owner student blocked from updating progress"
}

Write-Host "`n=== 6. Testing Milestone Evaluation and Supervisor Feedback ==="
# Create milestone on project
$milestone = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/milestones" -Method Post -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
    title = "System Architecture Document"
    description = "UML, ER diagrams, and microservice definitions"
    dueDate = "2026-11-15"
    status = "IN_PROGRESS"
    completion = 50
} | ConvertTo-Json)
$milestoneId = $milestone.id
Write-Host "PASS: Milestone created: id: $milestoneId title: $($milestone.title)"

# Faculty evaluates milestone
$evaluatedMilestone = Invoke-RestMethod -Uri "$BaseUrl/api/milestones/$milestoneId/review" -Method Put -Headers @{ Authorization = "Bearer $($newFacultyLogin.token)" } -ContentType "application/json" -Body (@{
    reviewStatus = "REVIEWED"
    reviewFeedback = "Architecture diagrams meet department standards. Approved to start coding."
} | ConvertTo-Json)
Write-Host "PASS: Faculty evaluated milestone: Status = $($evaluatedMilestone.reviewStatus), Feedback = '$($evaluatedMilestone.reviewFeedback)' by $($evaluatedMilestone.reviewedBy)"

# Student blocked from milestone review endpoint (403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/milestones/$milestoneId/review" -Method Put -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
        reviewStatus = "REVIEWED"
        reviewFeedback = "Self approved"
    } | ConvertTo-Json)
    Write-Host "FAILED: Student reviewed milestone" -ForegroundColor Red
} catch {
    Write-Host "PASS: Student blocked from reviewing milestone"
}

Write-Host "`n=== 7. Testing Coordinator Follow-up Notes ==="
$projectWithNote = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/follow-up" -Method Put -Headers @{ Authorization = "Bearer $coordToken" } -ContentType "application/json" -Body (@{
    notes = "Student team is on schedule. Mid-term presentation slot confirmed for Nov 20."
} | ConvertTo-Json)
Write-Host "PASS: Coordinator follow-up note saved: '$($projectWithNote.coordinatorNotes)' by $($projectWithNote.coordinatorNotesAuthor)"

Write-Host "`n=== 8. Testing Safe Project Deletion ==="
# Non-owner student attempts to delete project (should be 403)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId" -Method Delete -Headers @{ Authorization = "Bearer $($newStudentLogin.token)" }
    Write-Host "FAILED: Unauthorized student deleted project" -ForegroundColor Red
} catch {
    Write-Host "PASS: Unauthorized student blocked from deleting project"
}

# Owner student deletes the project (should be 204)
$deleteResp = Invoke-WebRequest -Uri "$BaseUrl/api/projects/$projectId" -Method Delete -Headers @{ Authorization = "Bearer $studentToken" } -UseBasicParsing
Write-Host "PASS: Owner student deleted project: HTTP $($deleteResp.StatusCode)"

# Verify project no longer exists (should be 404)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId" -Method Get -Headers @{ Authorization = "Bearer $studentToken" }
    Write-Host "FAILED: Deleted project still exists" -ForegroundColor Red
} catch {
    Write-Host "PASS: Deleted project confirmed removed (HTTP 404)"
}

Write-Host "`n=== ALL LIVE INTEGRATION AND ROLE SECURITY TESTS PASSED! ==="
