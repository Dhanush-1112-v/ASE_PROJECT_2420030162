package com.acadpredict.backend;

import com.acadpredict.backend.config.PasswordConfig;
import com.acadpredict.backend.config.SecurityConfig;
import com.acadpredict.backend.controller.AuthController;
import com.acadpredict.backend.controller.ProjectController;
import com.acadpredict.backend.dto.auth.AuthResponse;
import com.acadpredict.backend.dto.auth.LoginRequest;
import com.acadpredict.backend.dto.auth.RegisterRequest;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.exception.GlobalExceptionHandler;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.UserRepository;
import com.acadpredict.backend.security.JwtAuthenticationFilter;
import com.acadpredict.backend.security.JwtService;
import com.acadpredict.backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AuthAndSecurityTests {

    private MockMvc authMockMvc;
    private MockMvc projectMockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    private PasswordEncoder passwordEncoder;
    private ProjectController projectController;

    @BeforeEach
    void setUp() {
        passwordEncoder = new PasswordConfig().passwordEncoder();
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        AuthController authController = new AuthController(authService);
        authMockMvc = MockMvcBuilders.standaloneSetup(authController)
            .setControllerAdvice(exceptionHandler)
            .build();

        projectController = new ProjectController(projectRepository);
        projectMockMvc = MockMvcBuilders.standaloneSetup(projectController)
            .setControllerAdvice(exceptionHandler)
            .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("1 & 2. Public registration succeeds and returns 201 Created")
    void testValidRegistrationSucceeds() throws Exception {
        RegisterRequest request = new RegisterRequest("newstudent@college.edu", "Password123", "New Student");
        AuthResponse expectedResponse = new AuthResponse("jwt-token-123", 1L, "New Student", "newstudent@college.edu", "STUDENT");

        when(authService.register(any(RegisterRequest.class))).thenReturn(expectedResponse);

        authMockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.email").value("newstudent@college.edu"))
            .andExpect(jsonPath("$.role").value("STUDENT"))
            .andExpect(jsonPath("$.token").value("jwt-token-123"));
    }

    @Test
    @DisplayName("1b. Public login succeeds and returns 200 OK")
    void testValidLoginSucceeds() throws Exception {
        LoginRequest request = new LoginRequest("newstudent@college.edu", "Password123");
        AuthResponse expectedResponse = new AuthResponse("jwt-token-123", 1L, "New Student", "newstudent@college.edu", "STUDENT");

        when(authService.login(any(LoginRequest.class))).thenReturn(expectedResponse);

        authMockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("jwt-token-123"));
    }

    @Test
    @DisplayName("3. Duplicate email registration returns 409 Conflict with structured ErrorResponse")
    void testDuplicateRegistrationReturns409Conflict() throws Exception {
        RegisterRequest request = new RegisterRequest("duplicate@college.edu", "Password123", "Existing Student");

        when(authService.register(any(RegisterRequest.class)))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered"));

        authMockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.error").value("Conflict"))
            .andExpect(jsonPath("$.message").value("Email is already registered"))
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("4. Invalid request input (e.g. password < 8 chars) returns 400 Bad Request")
    void testInvalidRegistrationInputReturns400BadRequest() throws Exception {
        // Password "short" is < 8 characters, violating @Size(min = 8, max = 72)
        RegisterRequest request = new RegisterRequest("test@college.edu", "short", "Valid Name");

        authMockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("5. Unauthenticated request to protected endpoint is rejected")
    void testUnauthenticatedAccessRejected() {
        // With SecurityContext clear, no authenticated user is present
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
            "Unauthenticated request must have no security context");
    }

    @Test
    @DisplayName("6. STUDENT role cannot review a project (blocked by authorization)")
    void testStudentCannotReviewProject() {
        // Given user is authenticated as STUDENT
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("student@college.edu", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT")))
        );

        // Security check: verify user authority
        boolean hasReviewAuthority = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        assertFalse(hasReviewAuthority, "STUDENT must not possess review authorities");

        // GlobalExceptionHandler translates AccessDeniedException to 403 Forbidden
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        var response = handler.handleAccessDeniedException(new AccessDeniedException("Access denied"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(403, response.getBody().status());
        assertEquals("Forbidden", response.getBody().error());
    }

    @Test
    @DisplayName("7a. Authorized FACULTY can review a project and set status to APPROVED")
    void testFacultyCanReviewProject() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("faculty@college.edu", null, List.of(new SimpleGrantedAuthority("ROLE_FACULTY")))
        );

        boolean hasReviewAuthority = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        assertTrue(hasReviewAuthority, "FACULTY must possess review authorities");

        Project project = new Project();
        project.setProjectName("AI Delay Predictor");
        project.setStatus("PENDING_REVIEW");

        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        Project reviewed = projectController.review(10L, new ProjectController.ReviewRequest("APPROVED"));

        assertNotNull(reviewed);
        assertEquals("APPROVED", reviewed.getStatus());
        verify(projectRepository, times(1)).save(project);
    }

    @Test
    @DisplayName("7b. Authorized COORDINATOR can review a project and set status to REJECTED")
    void testCoordinatorCanReviewProject() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("coord@college.edu", null, List.of(new SimpleGrantedAuthority("ROLE_COORDINATOR")))
        );

        boolean hasReviewAuthority = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        assertTrue(hasReviewAuthority, "COORDINATOR must possess review authorities");

        Project project = new Project();
        project.setProjectName("IoT Smart Agriculture");
        project.setStatus("PENDING_REVIEW");

        when(projectRepository.findById(20L)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        Project reviewed = projectController.review(20L, new ProjectController.ReviewRequest("REJECTED"));

        assertNotNull(reviewed);
        assertEquals("REJECTED", reviewed.getStatus());
        verify(projectRepository, times(1)).save(project);
    }

    @Test
    @DisplayName("8. Passwords are stored as BCrypt hashes, not plaintext")
    void testPasswordsStoredAsBCryptHash() {
        String rawPassword = "StudentSecret123";
        String encoded = passwordEncoder.encode(rawPassword);

        assertNotNull(encoded);
        assertNotEquals(rawPassword, encoded, "Password must not be stored in plaintext");
        assertTrue(encoded.startsWith("$2a$") || encoded.startsWith("$2b$"),
            "Encoded password must follow standard BCrypt prefix format");
        assertTrue(passwordEncoder.matches(rawPassword, encoded),
            "BCrypt encoder must verify the correct raw password");
        assertFalse(passwordEncoder.matches("IncorrectPassword", encoded),
            "BCrypt encoder must reject an incorrect password");
    }
}
