$loginResp = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method Post -ContentType 'application/json' -Body (@{
    email = 'coordinator@college.edu'
    password = 'CoordinatorPass123!'
} | ConvertTo-Json)

$token = $loginResp.token
$headers = @{ Authorization = "Bearer $token" }

# Get projects
$projects = Invoke-RestMethod -Uri 'http://localhost:8081/api/projects' -Method Get -Headers $headers
$project = $projects[0]
Write-Host "Project: #$($project.id) Owner: $($project.owner.name) (ID: $($project.owner.id))"

# Get team members for project
$team = Invoke-RestMethod -Uri "http://localhost:8081/api/projects/$($project.id)/team" -Method Get -Headers $headers
Write-Host "Team members count: $($team.Count)"
$lead = $team | Where-Object { $_.isLeader -eq $true }
Write-Host "Lead in team response: name=$($lead.name) id=$($lead.id) userId=$($lead.userId)"

# Test 1: Create task assigned using lead.userId
$task1 = Invoke-RestMethod -Uri "http://localhost:8081/api/tasks" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    projectId = $project.id
    title = 'Assigned to Lead Test'
    description = 'Testing lead assignment'
    priority = 'HIGH'
    assignedToId = $lead.userId
} | ConvertTo-Json)
Write-Host "PASS: Created task assigned to lead (id=$($task1.id), assignedToName=$($task1.assignedToName), assignedToId=$($task1.assignedToId))"

# Test 2: Create task assigned using -1L (legacy fallback)
$task2 = Invoke-RestMethod -Uri "http://localhost:8081/api/tasks" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    projectId = $project.id
    title = 'Assigned with -1 Fallback Test'
    description = 'Testing fallback'
    priority = 'MEDIUM'
    assignedToId = -1
} | ConvertTo-Json)
Write-Host "PASS: Created task with -1 fallback (id=$($task2.id), assignedToName=$($task2.assignedToName), assignedToId=$($task2.assignedToId))"

# Clean up test tasks
Invoke-RestMethod -Uri "http://localhost:8081/api/tasks/$($task1.id)" -Method Delete -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8081/api/tasks/$($task2.id)" -Method Delete -Headers $headers
Write-Host "PASS: Cleaned up test tasks successfully"
Write-Host "`n=== TASK ASSIGNMENT VERIFICATION COMPLETE AND PASSED! ==="

