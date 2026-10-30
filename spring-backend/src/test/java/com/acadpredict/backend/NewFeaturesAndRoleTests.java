package com.acadpredict.backend;

import com.acadpredict.backend.controller.MilestoneController;
import com.acadpredict.backend.controller.ProjectController;
import com.acadpredict.backend.controller.UserController;
import com.acadpredict.backend.dto.CreateUserRequest;
import com.acadpredict.backend.entity.*;
import com.acadpredict.backend.exception.GlobalExceptionHandler;
import com.acadpredict.backend.repository.*;
import com.acadpredict.backend.service.DocumentStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class NewFeaturesAndRoleTests {

    private MockMvc userMockMvc;
    private MockMvc projectMockMvc;
    private MockMvc milestoneMockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private DocumentStorageService documentStorageService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        UserController userController = new UserController(userRepository, projectRepository, teamMemberRepository, passwordEncoder);
        ProjectController projectController = new ProjectController(
                projectRepository, userRepository, taskRepository, predictionRepository,
                milestoneRepository, teamMemberRepository, documentRepository, documentStorageService
        );
        MilestoneController milestoneController = new MilestoneController(
                milestoneRepository, projectRepository
        );

        userMockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        projectMockMvc = MockMvcBuilders.standaloneSetup(projectController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        milestoneMockMvc = MockMvcBuilders.standaloneSetup(milestoneController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String email, Role role) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User createUser(Long id, String email, String name, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setName(name);
        u.setRole(role);
        u.setPassword("$2a$10$hashedPasswordPlaceholder");
        return u;
    }

    private Project createProject(Long id, String name, User owner) {
        Project p = new Project();
        p.setId(id);
        p.setProjectName(name);
        p.setDescription("Test Project Description");
        p.setProjectType("AI");
        p.setStatus("PENDING");
        p.setProgress(0);
        p.setOwner(owner);
        return p;
    }

    // --- B. Account Provisioning Tests ---

    @Test
    @DisplayName("Faculty can create a student account")
    void facultyCanCreateStudentAccount() throws Exception {
        authenticate("prof@university.edu", Role.FACULTY);

        CreateUserRequest req = new CreateUserRequest("Alice Student", "alice@university.edu", "Password123!", Role.STUDENT);

        when(userRepository.findByEmail("alice@university.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashedPwd");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(10L);
            return u;
        });

        userMockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.email").value("alice@university.edu"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    @DisplayName("Faculty cannot create a faculty account (403)")
    void facultyCannotCreateFacultyAccount() throws Exception {
        authenticate("prof@university.edu", Role.FACULTY);

        CreateUserRequest req = new CreateUserRequest("Dr. Bob", "bob@university.edu", "Password123!", Role.FACULTY);

        userMockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Coordinator can create both student and faculty accounts")
    void coordinatorCanCreateStudentAndFaculty() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        CreateUserRequest facultyReq = new CreateUserRequest("Dr. Bob", "bob@university.edu", "Password123!", Role.FACULTY);

        when(userRepository.findByEmail("bob@university.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashedPwd");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(20L);
            return u;
        });

        userMockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(facultyReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("FACULTY"));
    }

    @Test
    @DisplayName("Account creation rejects duplicate email (409)")
    void accountCreationRejectsDuplicateEmail() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        CreateUserRequest req = new CreateUserRequest("Duplicate User", "existing@university.edu", "Password123!", Role.STUDENT);

        when(userRepository.existsByEmail("existing@university.edu")).thenReturn(true);

        userMockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // --- C & D. Progress Persistence & Authorization ---

    @Test
    @DisplayName("Student can update progress on their own project")
    void studentCanUpdateOwnProjectProgress() throws Exception {
        authenticate("student@university.edu", Role.STUDENT);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);
        project.setProgress(20);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Integer> body = Map.of("progress", 75);

        projectMockMvc.perform(put("/api/projects/1/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress").value(75));
    }

    @Test
    @DisplayName("Student cannot update progress of another student's project (403)")
    void studentCannotUpdateOtherStudentProgress() throws Exception {
        authenticate("intruder@university.edu", Role.STUDENT);

        User owner = createUser(2L, "owner@university.edu", "Owner", Role.STUDENT);
        Project project = createProject(1L, "Test Project", owner);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

        Map<String, Integer> body = Map.of("progress", 50);

        projectMockMvc.perform(put("/api/projects/1/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Progress values outside 0-100 are rejected (400)")
    void invalidProgressValueRejected() throws Exception {
        authenticate("student@university.edu", Role.STUDENT);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

        Map<String, Integer> body = Map.of("progress", 150);

        projectMockMvc.perform(put("/api/projects/1/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // --- E. Coordinator Faculty Assignment ---

    @Test
    @DisplayName("Coordinator can assign faculty guide to a project")
    void coordinatorCanAssignFacultyGuide() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);

        User faculty = createUser(5L, "smith@university.edu", "Dr. Smith", Role.FACULTY);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(userRepository.findById(5L)).thenReturn(Optional.of(faculty));
        when(projectRepository.save(any(Project.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Long> body = Map.of("facultyId", 5L);

        projectMockMvc.perform(put("/api/projects/1/assign-guide")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facultyGuideId").value(5))
                .andExpect(jsonPath("$.facultyGuideName").value("Dr. Smith"));
    }

    @Test
    @DisplayName("Assigning a non-faculty account as guide fails (400)")
    void assigningNonFacultyGuideFails() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        User studentOwner = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", studentOwner);

        User otherStudent = createUser(9L, "notfac@university.edu", "Not Faculty", Role.STUDENT);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(userRepository.findById(9L)).thenReturn(Optional.of(otherStudent));

        Map<String, Long> body = Map.of("facultyId", 9L);

        projectMockMvc.perform(put("/api/projects/1/assign-guide")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // --- C2. Milestone Evaluation & Review ---

    @Test
    @DisplayName("Faculty can review a milestone and leave feedback")
    void facultyCanReviewMilestone() throws Exception {
        authenticate("prof@university.edu", Role.FACULTY);

        User faculty = createUser(3L, "prof@university.edu", "Prof", Role.FACULTY);
        Project project = createProject(1L, "Project", null);
        project.setFacultyGuide(faculty);

        Milestone milestone = new Milestone();
        milestone.setId(10L);
        milestone.setTitle("Milestone 1");
        milestone.setDescription("Desc");
        milestone.setStatus("UPCOMING");
        milestone.setProject(project);

        when(milestoneRepository.findById(10L)).thenReturn(Optional.of(milestone));
        when(userRepository.findByEmail("prof@university.edu")).thenReturn(Optional.of(faculty));
        when(milestoneRepository.save(any(Milestone.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, String> body = Map.of(
                "reviewStatus", "REVIEWED",
                "reviewFeedback", "Great progress on the architecture."
        );

        milestoneMockMvc.perform(put("/api/milestones/10/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("REVIEWED"))
                .andExpect(jsonPath("$.reviewFeedback").value("Great progress on the architecture."));
    }

    // --- D3. Coordinator Follow-Up Notes ---

    @Test
    @DisplayName("Coordinator can update follow-up notes on project")
    void coordinatorCanUpdateFollowUpNotes() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        User coord = createUser(4L, "coord@university.edu", "Coord", Role.COORDINATOR);
        Project project = createProject(1L, "Project", null);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(userRepository.findByEmail("coord@university.edu")).thenReturn(Optional.of(coord));
        when(projectRepository.save(any(Project.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, String> body = Map.of("notes", "Requires revised milestone plan before mid-term.");

        projectMockMvc.perform(put("/api/projects/1/follow-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coordinatorNotes").value("Requires revised milestone plan before mid-term."))
                .andExpect(jsonPath("$.coordinatorNotesAuthor").value("coord@university.edu"));
    }

    // --- G. Project Deletion ---

    @Test
    @DisplayName("Owner student can delete their own project")
    void ownerStudentCanDeleteProject() throws Exception {
        authenticate("student@university.edu", Role.STUDENT);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(documentRepository.findByProjectId(1L)).thenReturn(Collections.emptyList());

        projectMockMvc.perform(delete("/api/projects/1"))
                .andExpect(status().isNoContent());

        verify(projectRepository, times(1)).delete(project);
    }

    @Test
    @DisplayName("Non-owner student cannot delete project (403)")
    void nonOwnerStudentCannotDeleteProject() throws Exception {
        authenticate("intruder@university.edu", Role.STUDENT);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

        projectMockMvc.perform(delete("/api/projects/1"))
                .andExpect(status().isForbidden());

        verify(projectRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Coordinator can delete any project in departmental scope")
    void coordinatorCanDeleteAnyProject() throws Exception {
        authenticate("coord@university.edu", Role.COORDINATOR);

        User student = createUser(1L, "student@university.edu", "Student", Role.STUDENT);
        Project project = createProject(1L, "Test Project", student);

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(documentRepository.findByProjectId(1L)).thenReturn(Collections.emptyList());

        projectMockMvc.perform(delete("/api/projects/1"))
                .andExpect(status().isNoContent());

        verify(projectRepository, times(1)).delete(project);
    }
}
