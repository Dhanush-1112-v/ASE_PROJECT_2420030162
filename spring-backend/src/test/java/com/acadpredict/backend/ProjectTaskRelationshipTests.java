package com.acadpredict.backend;

import com.acadpredict.backend.controller.ProjectController;
import com.acadpredict.backend.controller.TaskController;
import com.acadpredict.backend.dto.ProjectRequest;
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
import org.springframework.http.MediaType;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class ProjectTaskRelationshipTests {

    private MockMvc projectMockMvc;
    private MockMvc taskMockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
        .configure(com.fasterxml.jackson.databind.MapperFeature.REQUIRE_HANDLERS_FOR_JAVA8_TIMES, false);

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    private ProjectController projectController;
    private TaskController taskController;

    private User studentA;
    private User studentB;
    private User facultyUser;

    @BeforeEach
    void setUp() {
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        projectController = new ProjectController(projectRepository, userRepository);
        projectMockMvc = MockMvcBuilders.standaloneSetup(projectController)
            .setControllerAdvice(exceptionHandler)
            .build();

        taskController = new TaskController(taskRepository, projectRepository);
        taskMockMvc = MockMvcBuilders.standaloneSetup(taskController)
            .setControllerAdvice(exceptionHandler)
            .build();

        studentA = new User();
        studentA.setId(1L);
        studentA.setEmail("studentA@college.edu");
        studentA.setName("Student Alice");
        studentA.setRole(Role.STUDENT);
        studentA.setPassword("$2a$10$hashedPasswordForAlice12345");

        studentB = new User();
        studentB.setId(2L);
        studentB.setEmail("studentB@college.edu");
        studentB.setName("Student Bob");
        studentB.setRole(Role.STUDENT);
        studentB.setPassword("$2a$10$hashedPasswordForBob12345");

        facultyUser = new User();
        facultyUser.setId(3L);
        facultyUser.setEmail("faculty@college.edu");
        facultyUser.setName("Dr. Smith");
        facultyUser.setRole(Role.FACULTY);
        facultyUser.setPassword("$2a$10$hashedPasswordForFaculty12345");
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
    @DisplayName("1. Creating a project assigns the authenticated student as owner")
    void testCreateProjectAssignsAuthenticatedStudentAsOwner() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findByEmail("studentA@college.edu")).thenReturn(Optional.of(studentA));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectRequest request = new ProjectRequest("AI-AcadPredict", "Academic tracking platform", "Capstone");
        Project created = projectController.create(request, auth);

        assertNotNull(created);
        assertNotNull(created.getOwner(), "Created project must have an owner associated");
        assertEquals("studentA@college.edu", created.getOwner().getEmail());
        assertEquals(1L, created.getOwnerId());
        assertEquals("AI-AcadPredict", created.getProjectName());

        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(projectCaptor.capture());
        assertEquals(studentA, projectCaptor.getValue().getOwner());
    }

    @Test
    @DisplayName("2a. A student cannot read another student's project (returns 403 Forbidden)")
    void testStudentCannotReadAnotherStudentsProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectB = new Project();
        projectB.setId(101L);
        projectB.setProjectName("Bob's Private Project");
        projectB.setOwner(studentB);

        when(projectRepository.findById(101L)).thenReturn(Optional.of(projectB));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> projectController.getById(101L, auth)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getReason().contains("do not own this project"));
    }

    @Test
    @DisplayName("2b. A student can read their own project (returns 200 OK)")
    void testStudentCanReadOwnProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectA = new Project();
        projectA.setId(102L);
        projectA.setProjectName("Alice's Project");
        projectA.setOwner(studentA);

        when(projectRepository.findById(102L)).thenReturn(Optional.of(projectA));

        Project result = projectController.getById(102L, auth);

        assertNotNull(result);
        assertEquals("Alice's Project", result.getProjectName());
        assertEquals(1L, result.getOwnerId());
    }

    @Test
    @DisplayName("2c. Faculty or Coordinator can read any student's project for review")
    void testFacultyOrCoordinatorCanReadAnyProject() {
        Authentication auth = createAuth("faculty@college.edu", "FACULTY");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectA = new Project();
        projectA.setId(103L);
        projectA.setProjectName("Alice's Capstone");
        projectA.setOwner(studentA);

        when(projectRepository.findById(103L)).thenReturn(Optional.of(projectA));

        Project result = projectController.getById(103L, auth);

        assertNotNull(result);
        assertEquals(103L, result.getId());
        assertEquals("studentA@college.edu", result.getOwner().getEmail());
    }

    @Test
    @DisplayName("3. A task cannot reference a nonexistent project (returns 404 Not Found)")
    void testTaskCannotReferenceNonexistentProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(projectRepository.findById(999L)).thenReturn(Optional.empty());

        TaskRequest request = new TaskRequest("Build UI Prototype", 999L);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(request, auth)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Project not found"));
    }

    @Test
    @DisplayName("4. Tasks are associated with the correct project")
    void testTasksAreAssociatedWithCorrectProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectA = new Project();
        projectA.setId(200L);
        projectA.setProjectName("Alice's Project");
        projectA.setOwner(studentA);

        when(projectRepository.findById(200L)).thenReturn(Optional.of(projectA));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskRequest request = new TaskRequest("Setup MySQL Schema", 200L);
        TaskResponse created = taskController.create(request, auth);

        assertNotNull(created);
        assertEquals("Setup MySQL Schema", created.title());
        assertEquals("PENDING", created.status());
        assertEquals(0, created.progress());
        assertEquals(200L, created.projectId());
        assertEquals("Alice's Project", created.projectName());

        ArgumentCaptor<Task> taskCaptor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(taskCaptor.capture());
        assertEquals(projectA, taskCaptor.getValue().getProject());
    }

    @Test
    @DisplayName("5a. A student cannot create a task for another student's project (returns 403 Forbidden)")
    void testStudentCannotCreateTaskForAnotherStudentsProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectB = new Project();
        projectB.setId(300L);
        projectB.setProjectName("Bob's Project");
        projectB.setOwner(studentB);

        when(projectRepository.findById(300L)).thenReturn(Optional.of(projectB));

        TaskRequest request = new TaskRequest("Malicious Task Injection", 300L);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> taskController.create(request, auth)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getReason().contains("do not own this project"));
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("5b. A student cannot access or modify another student's task (returns 403 Forbidden)")
    void testStudentCannotAccessOrModifyAnotherStudentsTask() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectB = new Project();
        projectB.setId(350L);
        projectB.setOwner(studentB);

        Task taskB = new Task();
        taskB.setId(400L);
        taskB.setTitle("Bob's Private Task");
        taskB.setProject(projectB);

        when(taskRepository.findById(400L)).thenReturn(Optional.of(taskB));

        // Read attempt
        ResponseStatusException readException = assertThrows(
            ResponseStatusException.class,
            () -> taskController.getById(400L, auth)
        );
        assertEquals(HttpStatus.FORBIDDEN, readException.getStatusCode());

        // Update attempt
        ResponseStatusException updateException = assertThrows(
            ResponseStatusException.class,
            () -> taskController.update(400L, new TaskController.TaskUpdate(50), auth)
        );
        assertEquals(HttpStatus.FORBIDDEN, updateException.getStatusCode());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("5c. A student can access and modify their own task (returns 200 OK)")
    void testStudentCanAccessAndModifyOwnTask() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Project projectA = new Project();
        projectA.setId(250L);
        projectA.setOwner(studentA);

        Task taskA = new Task();
        taskA.setId(500L);
        taskA.setTitle("Alice's Task");
        taskA.setProject(projectA);
        taskA.setProgress(20);
        taskA.setStatus("IN_PROGRESS");

        when(taskRepository.findById(500L)).thenReturn(Optional.of(taskA));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponse fetched = taskController.getById(500L, auth);
        assertNotNull(fetched);
        assertEquals(500L, fetched.id());

        TaskResponse updated = taskController.update(500L, new TaskController.TaskUpdate(100), auth);
        assertNotNull(updated);
        assertEquals(100, updated.progress());
        assertEquals("COMPLETED", updated.status());
        verify(taskRepository).save(taskA);
    }

    @Test
    @DisplayName("6. Existing faculty/coordinator review authorization still works")
    void testExistingFacultyCoordinatorReviewStillWorks() {
        Authentication facultyAuth = createAuth("faculty@college.edu", "FACULTY");
        SecurityContextHolder.getContext().setAuthentication(facultyAuth);

        Project project = new Project();
        project.setId(600L);
        project.setProjectName("Final Year AI");
        project.setStatus("PENDING_REVIEW");
        project.setOwner(studentA);

        when(projectRepository.findById(600L)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        Project reviewed = projectController.review(600L, new ProjectController.ReviewRequest("APPROVED"));
        assertNotNull(reviewed);
        assertEquals("APPROVED", reviewed.getStatus());
    }

    @Test
    @DisplayName("7. API responses do not serialize recursive entity graphs or password hashes")
    void testApiResponsesDoNotSerializeRecursiveGraphsOrPasswordHashes() throws Exception {
        Project project = new Project();
        project.setId(700L);
        project.setProjectName("Serialization Safety Test");
        project.setDescription("Verifying Jackson serialization");
        project.setProjectType("Research");
        project.setStatus("IN_PROGRESS");
        project.setProgress(45);
        project.setOwner(studentA);

        Task task = new Task();
        task.setId(800L);
        task.setTitle("Safe Serialization Task");
        task.setProgress(60);
        task.setStatus("IN_PROGRESS");
        task.setProject(project);

        project.getTasks().add(task);

        // Serialize Project
        String projectJson = objectMapper.writeValueAsString(project);
        assertNotNull(projectJson);
        assertFalse(projectJson.contains("password"), "Project JSON must NOT contain password field");
        assertFalse(projectJson.contains("hashedPasswordForAlice"), "Project JSON must NOT contain password hash");
        assertTrue(projectJson.contains("\"ownerId\":1"));
        assertTrue(projectJson.contains("\"email\":\"studentA@college.edu\""));

        // Serialize Task
        String taskJson = objectMapper.writeValueAsString(task);
        assertNotNull(taskJson);
        assertFalse(taskJson.contains("password"), "Task JSON must NOT contain password field");
        assertFalse(taskJson.contains("hashedPasswordForAlice"), "Task JSON must NOT contain password hash");
        assertTrue(taskJson.contains("\"projectId\":700"));
        assertTrue(taskJson.contains("\"title\":\"Safe Serialization Task\""));
    }
}
