package com.acadpredict.backend;

import com.acadpredict.backend.controller.ProjectController;
import com.acadpredict.backend.controller.TaskController;
import com.acadpredict.backend.dto.TaskRequest;
import com.acadpredict.backend.dto.TaskResponse;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.Task;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.exception.GlobalExceptionHandler;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.TaskRepository;
import com.acadpredict.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TaskCreationApiTests {

    private MockMvc taskMockMvc;
    private MockMvc projectMockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    private TaskController taskController;
    private ProjectController projectController;

    private User studentA;
    private User studentB;
    private User facultyUser;
    private Project projectA;
    private Project projectB;

    @BeforeEach
    void setUp() {
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        taskController = new TaskController(taskRepository, projectRepository);
        taskMockMvc = MockMvcBuilders.standaloneSetup(taskController)
            .setControllerAdvice(exceptionHandler)
            .build();

        projectController = new ProjectController(projectRepository, userRepository, taskRepository);
        projectMockMvc = MockMvcBuilders.standaloneSetup(projectController)
            .setControllerAdvice(exceptionHandler)
            .build();

        studentA = new User();
        studentA.setId(10L);
        studentA.setEmail("alice@college.edu");
        studentA.setName("Alice Cooper");
        studentA.setRole(Role.STUDENT);

        studentB = new User();
        studentB.setId(20L);
        studentB.setEmail("bob@college.edu");
        studentB.setName("Bob Dylan");
        studentB.setRole(Role.STUDENT);

        facultyUser = new User();
        facultyUser.setId(30L);
        facultyUser.setEmail("faculty@college.edu");
        facultyUser.setName("Prof. Williams");
        facultyUser.setRole(Role.FACULTY);

        projectA = new Project();
        projectA.setId(100L);
        projectA.setProjectName("Alice ML Project");
        projectA.setOwner(studentA);

        projectB = new Project();
        projectB.setId(200L);
        projectB.setProjectName("Bob Web Project");
        projectB.setOwner(studentB);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Authentication createAuth(String email, String role) {
        return new UsernamePasswordAuthenticationToken(
            email,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
    }

    @Test
    @DisplayName("1. Successful task creation returns 201 Created and TaskResponse DTO")
    void testSuccessfulTaskCreationReturnsTaskResponse() {
        Authentication auth = createAuth("alice@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(projectRepository.findById(100L)).thenReturn(Optional.of(projectA));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        TaskRequest request = new TaskRequest(
            "Implement Feature X",
            100L,
            "Detailed task description",
            "HIGH",
            "2026-11-15"
        );

        TaskResponse response = taskController.create(request, auth);

        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals("Implement Feature X", response.title());
        assertEquals("Detailed task description", response.description());
        assertEquals("HIGH", response.priority());
        assertEquals("2026-11-15", response.dueDate());
        assertEquals("PENDING", response.status());
        assertEquals(0, response.progress());
        assertEquals(100L, response.projectId());
        assertEquals("Alice ML Project", response.projectName());

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository, times(1)).save(captor.capture());
        Task captured = captor.getValue();
        assertEquals("Implement Feature X", captured.getTitle());
        assertEquals(projectA, captured.getProject());
    }

    @Test
    @DisplayName("2. Validation rejects null or blank title with 400 Bad Request")
    void testValidationRejectsNullOrBlankTitle() {
        Authentication auth = createAuth("alice@college.edu", "STUDENT");

        // Null title
        TaskRequest nullTitle = new TaskRequest(null, 100L);
        ResponseStatusException ex1 = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(nullTitle, auth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatusCode());
        assertTrue(ex1.getReason().contains("Task title is required"));

        // Blank title
        TaskRequest blankTitle = new TaskRequest("   ", 100L);
        ResponseStatusException ex2 = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(blankTitle, auth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatusCode());
        assertTrue(ex2.getReason().contains("Task title is required"));

        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("3. Validation rejects null projectId with 400 Bad Request")
    void testValidationRejectsNullProjectId() {
        Authentication auth = createAuth("alice@college.edu", "STUDENT");

        TaskRequest noProjectId = new TaskRequest("Valid Title", null);
        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(noProjectId, auth)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Project ID is required"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("4. Validation rejects invalid priority value with 400 Bad Request")
    void testValidationRejectsInvalidPriority() {
        Authentication auth = createAuth("alice@college.edu", "STUDENT");
        when(projectRepository.findById(100L)).thenReturn(Optional.of(projectA));

        TaskRequest invalidPriority = new TaskRequest(
            "Valid Title",
            100L,
            "Description",
            "ULTRA_HIGH",
            "2026-11-20"
        );

        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(invalidPriority, auth)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Priority must be LOW, MEDIUM, HIGH, or CRITICAL"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("5. Nonexistent project returns 404 Not Found")
    void testNonexistentProjectReturns404NotFound() {
        Authentication auth = createAuth("alice@college.edu", "STUDENT");
        when(projectRepository.findById(999L)).thenReturn(Optional.empty());

        TaskRequest request = new TaskRequest("Some Task", 999L);
        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(request, auth)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Project not found"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("6. Unauthenticated creation request returns 401 Unauthorized")
    void testUnauthenticatedCreationReturns401() {
        TaskRequest request = new TaskRequest("Task Title", 100L);

        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(request, null)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("7. Cross-student task creation returns 403 Forbidden")
    void testCrossStudentTaskCreationReturns403() {
        // Alice attempts to create task on Bob's project
        Authentication auth = createAuth("alice@college.edu", "STUDENT");
        when(projectRepository.findById(200L)).thenReturn(Optional.of(projectB));

        TaskRequest request = new TaskRequest("Unauthorized Task", 200L);
        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(request, auth)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("do not own this project"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    @DisplayName("8. Faculty or Coordinator can create tasks on any student project")
    void testStaffCanCreateTaskOnStudentProject() {
        Authentication auth = createAuth("faculty@college.edu", "FACULTY");
        when(projectRepository.findById(100L)).thenReturn(Optional.of(projectA));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(5L);
            return t;
        });

        TaskRequest request = new TaskRequest("Advisor Assigned Task", 100L, "Review literature", "HIGH", "2026-12-01");
        TaskResponse response = taskController.create(request, auth);

        assertNotNull(response);
        assertEquals(5L, response.id());
        assertEquals("Advisor Assigned Task", response.title());
        assertEquals(100L, response.projectId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("9. GET /api/projects/{id}/tasks returns List<TaskResponse> with authorization checks")
    void testGetProjectTasksListEndpoint() {
        Task t1 = new Task();
        t1.setId(101L);
        t1.setTitle("Task 1");
        t1.setProject(projectA);

        Task t2 = new Task();
        t2.setId(102L);
        t2.setTitle("Task 2");
        t2.setProject(projectA);

        when(projectRepository.findById(100L)).thenReturn(Optional.of(projectA));
        when(taskRepository.findByProjectId(100L)).thenReturn(List.of(t1, t2));

        // Alice (owner) reads own tasks
        Authentication aliceAuth = createAuth("alice@college.edu", "STUDENT");
        List<TaskResponse> aliceTasks = projectController.getProjectTasks(100L, aliceAuth);
        assertEquals(2, aliceTasks.size());
        assertEquals("Task 1", aliceTasks.get(0).title());
        assertEquals("Task 2", aliceTasks.get(1).title());

        // Bob reads Alice's project tasks -> 403 Forbidden
        Authentication bobAuth = createAuth("bob@college.edu", "STUDENT");
        ResponseStatusException forbiddenEx = assertThrows(
            ResponseStatusException.class,
            () -> projectController.getProjectTasks(100L, bobAuth)
        );
        assertEquals(HttpStatus.FORBIDDEN, forbiddenEx.getStatusCode());

        // Faculty reads Alice's project tasks -> 200 OK
        Authentication facultyAuth = createAuth("faculty@college.edu", "FACULTY");
        List<TaskResponse> facultyTasks = projectController.getProjectTasks(100L, facultyAuth);
        assertEquals(2, facultyTasks.size());
    }

    @Test
    @DisplayName("10. Task update validates progress and enforces ownership")
    void testTaskUpdateValidationAndOwnership() {
        Task taskA = new Task();
        taskA.setId(50L);
        taskA.setTitle("Existing Task");
        taskA.setProgress(20);
        taskA.setStatus("IN_PROGRESS");
        taskA.setProject(projectA);

        when(taskRepository.findById(50L)).thenReturn(Optional.of(taskA));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Authentication aliceAuth = createAuth("alice@college.edu", "STUDENT");

        // Invalid progress (< 0) -> 400
        ResponseStatusException exNegative = assertThrows(
            ResponseStatusException.class,
            () -> taskController.update(50L, new TaskController.TaskUpdate(-5), aliceAuth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, exNegative.getStatusCode());

        // Invalid progress (> 100) -> 400
        ResponseStatusException exExcessive = assertThrows(
            ResponseStatusException.class,
            () -> taskController.update(50L, new TaskController.TaskUpdate(105), aliceAuth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, exExcessive.getStatusCode());

        // Bob attempts to update Alice's task -> 403 Forbidden
        Authentication bobAuth = createAuth("bob@college.edu", "STUDENT");
        ResponseStatusException exForbidden = assertThrows(
            ResponseStatusException.class,
            () -> taskController.update(50L, new TaskController.TaskUpdate(50), bobAuth)
        );
        assertEquals(HttpStatus.FORBIDDEN, exForbidden.getStatusCode());

        // Alice valid update to 100 -> progress=100, status=COMPLETED
        TaskResponse updated = taskController.update(50L, new TaskController.TaskUpdate(100), aliceAuth);
        assertEquals(100, updated.progress());
        assertEquals("COMPLETED", updated.status());
    }

    @Test
    @DisplayName("11. TaskResponse DTO serialization is safe and decoupled from JPA entities")
    void testTaskResponseDtoSerialization() throws Exception {
        Task task = new Task();
        task.setId(77L);
        task.setTitle("DTO Test Task");
        task.setDescription("Clean DTO verification");
        task.setPriority("CRITICAL");
        task.setDueDate("2026-12-31");
        task.setStatus("PENDING");
        task.setProgress(0);
        task.setProject(projectA);

        TaskResponse dto = TaskResponse.from(task);
        String json = objectMapper.writeValueAsString(dto);

        assertNotNull(json);
        assertTrue(json.contains("\"id\":77"));
        assertTrue(json.contains("\"title\":\"DTO Test Task\""));
        assertTrue(json.contains("\"priority\":\"CRITICAL\""));
        assertTrue(json.contains("\"projectId\":100"));
        assertTrue(json.contains("\"projectName\":\"Alice ML Project\""));
        assertFalse(json.contains("password"), "DTO must not serialize passwords");
        assertFalse(json.contains("owner"), "DTO must not serialize nested entity graphs directly");
    }
}
