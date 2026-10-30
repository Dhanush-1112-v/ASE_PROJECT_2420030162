package com.acadpredict.backend;

import com.acadpredict.backend.controller.PredictionController;
import com.acadpredict.backend.controller.ProjectController;
import com.acadpredict.backend.dto.PredictionRequest;
import com.acadpredict.backend.dto.PredictionResponse;
import com.acadpredict.backend.dto.PredictionResultResponse;
import com.acadpredict.backend.entity.Prediction;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.exception.GlobalExceptionHandler;
import com.acadpredict.backend.repository.PredictionRepository;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.TaskRepository;
import com.acadpredict.backend.repository.UserRepository;
import com.acadpredict.backend.service.AiPredictionService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PredictionPersistenceTests {

    private MockMvc predictionMockMvc;
    private MockMvc projectMockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AiPredictionService aiPredictionService;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    private PredictionController predictionController;
    private ProjectController projectController;

    private User studentA;
    private User studentB;
    private User facultyUser;
    private Project projectA;
    private Project projectB;

    @BeforeEach
    void setUp() {
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        predictionController = new PredictionController(
                aiPredictionService,
                projectRepository,
                predictionRepository
        );
        predictionMockMvc = MockMvcBuilders.standaloneSetup(predictionController)
                .setControllerAdvice(exceptionHandler)
                .build();

        projectController = new ProjectController(
                projectRepository,
                userRepository,
                taskRepository,
                predictionRepository
        );
        projectMockMvc = MockMvcBuilders.standaloneSetup(projectController)
                .setControllerAdvice(exceptionHandler)
                .build();

        studentA = new User();
        studentA.setId(1L);
        studentA.setEmail("studentA@college.edu");
        studentA.setName("Alice Cooper");
        studentA.setRole(Role.STUDENT);

        studentB = new User();
        studentB.setId(2L);
        studentB.setEmail("studentB@college.edu");
        studentB.setName("Bob Dylan");
        studentB.setRole(Role.STUDENT);

        facultyUser = new User();
        facultyUser.setId(3L);
        facultyUser.setEmail("faculty@college.edu");
        facultyUser.setName("Prof. Williams");
        facultyUser.setRole(Role.FACULTY);

        projectA = new Project();
        projectA.setId(10L);
        projectA.setProjectName("Alice ML Project");
        projectA.setOwner(studentA);

        projectB = new Project();
        projectB.setId(20L);
        projectB.setProjectName("Bob IoT Project");
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

    private PredictionRequest createValidRequest(Long projectId) {
        return new PredictionRequest(
                projectId,
                85.0,  // attendance
                20.0,  // studyHours
                75.0,  // previousPerformance
                60.0,  // taskCompletion
                5,     // pendingTasks
                1,     // missedDeadlines
                70.0,  // milestoneCompletion
                14,    // daysRemaining
                4,     // teamSize
                "AI",  // projectType
                65.0   // projectProgress
        );
    }

    @Test
    @DisplayName("1. Successful AI prediction and persistence to MySQL")
    void testSuccessfulPredictionAndPersistence() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenReturn(new PredictionResponse("HIGH", 0.8452));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(inv -> {
            Prediction p = inv.getArgument(0);
            p.setId(100L);
            return p;
        });

        PredictionRequest request = createValidRequest(10L);
        PredictionResultResponse response = predictionController.predict(request, auth);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(10L, response.projectId());
        assertEquals("Alice ML Project", response.projectName());
        assertEquals("HIGH", response.risk());
        assertEquals(0.8452, response.probability(), 0.0001);
        assertNotNull(response.createdAt());

        // Verify entity persisted in repository
        ArgumentCaptor<Prediction> predCaptor = ArgumentCaptor.forClass(Prediction.class);
        verify(predictionRepository, times(1)).save(predCaptor.capture());
        Prediction saved = predCaptor.getValue();
        assertEquals("HIGH", saved.getRisk());
        assertEquals(0.8452, saved.getProbability(), 0.0001);
        assertEquals(projectA, saved.getProject());

        // Verify project's cached delayRisk and riskProbability updated
        assertEquals("HIGH", projectA.getDelayRisk());
        assertEquals(0.8452, projectA.getRiskProbability(), 0.0001);
        verify(projectRepository, times(1)).save(projectA);
    }

    @Test
    @DisplayName("2. Correct association between prediction and project")
    void testCorrectAssociationBetweenPredictionAndProject() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenReturn(new PredictionResponse("LOW", 0.912));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionRequest request = createValidRequest(10L);
        predictionController.predict(request, auth);

        ArgumentCaptor<Prediction> predCaptor = ArgumentCaptor.forClass(Prediction.class);
        verify(predictionRepository).save(predCaptor.capture());
        assertEquals(projectA.getId(), predCaptor.getValue().getProject().getId());
        assertEquals(projectA.getProjectName(), predCaptor.getValue().getProject().getProjectName());
    }

    @Test
    @DisplayName("3. Correct mapping of risk category and probability values")
    void testCorrectMappingOfRiskAndProbability() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenReturn(new PredictionResponse("MEDIUM", 0.6789));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionRequest request = createValidRequest(10L);
        PredictionResultResponse response = predictionController.predict(request, auth);

        assertEquals("MEDIUM", response.risk());
        assertEquals(0.6789, response.probability(), 0.0001);
    }

    @Test
    @DisplayName("4. Prediction history retrieval in newest-first order")
    void testPredictionHistoryRetrievalNewestFirst() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));

        Prediction p1 = new Prediction();
        p1.setId(101L);
        p1.setProject(projectA);
        p1.setRisk("MEDIUM");
        p1.setProbability(0.55);
        p1.setCreatedAt(LocalDateTime.now().minusDays(2));

        Prediction p2 = new Prediction();
        p2.setId(102L);
        p2.setProject(projectA);
        p2.setRisk("HIGH");
        p2.setProbability(0.85);
        p2.setCreatedAt(LocalDateTime.now().minusHours(1));

        // Repository returns ordered by createdAt DESC (p2 newest, then p1)
        when(predictionRepository.findByProjectIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(p2, p1));

        List<PredictionResultResponse> history = projectController.getProjectPredictions(10L, auth);

        assertNotNull(history);
        assertEquals(2, history.size());
        assertEquals(102L, history.get(0).id(), "Newest prediction must be first");
        assertEquals("HIGH", history.get(0).risk());
        assertEquals(101L, history.get(1).id());
        assertEquals("MEDIUM", history.get(1).risk());
    }

    @Test
    @DisplayName("5. Empty prediction history returns empty list")
    void testEmptyPredictionHistory() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(predictionRepository.findByProjectIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        List<PredictionResultResponse> history = projectController.getProjectPredictions(10L, auth);

        assertNotNull(history);
        assertTrue(history.isEmpty());
    }

    @Test
    @DisplayName("6. Missing project returns 404 Not Found")
    void testMissingProjectReturns404() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(999L)).thenReturn(Optional.empty());

        PredictionRequest request = createValidRequest(999L);
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(request, auth)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Project not found"));
        verify(predictionRepository, never()).save(any());
    }

    @Test
    @DisplayName("7. Unauthorized cross-student access returns 403 Forbidden")
    void testUnauthorizedCrossStudentAccess() {
        // Alice attempts to predict on Bob's project
        Authentication aliceAuth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(20L)).thenReturn(Optional.of(projectB));

        PredictionRequest request = createValidRequest(20L);
        ResponseStatusException exPredict = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(request, aliceAuth)
        );
        assertEquals(HttpStatus.FORBIDDEN, exPredict.getStatusCode());
        assertTrue(exPredict.getReason().contains("do not own this project"));

        // Alice attempts to read Bob's prediction history
        ResponseStatusException exHistory = assertThrows(
                ResponseStatusException.class,
                () -> projectController.getProjectPredictions(20L, aliceAuth)
        );
        assertEquals(HttpStatus.FORBIDDEN, exHistory.getStatusCode());

        verify(predictionRepository, never()).save(any());
    }

    @Test
    @DisplayName("8. Invalid prediction input returns 400 Bad Request")
    void testInvalidPredictionInput() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");

        // Missing projectId
        PredictionRequest noProjectId = new PredictionRequest(
                null, 80.0, 15.0, 70.0, 50.0, 3, 0, 80.0, 20, 4, "Web", 50.0
        );
        ResponseStatusException exNoId = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(noProjectId, auth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, exNoId.getStatusCode());
        assertTrue(exNoId.getReason().contains("Project ID is required"));

        // Invalid projectType
        PredictionRequest badType = new PredictionRequest(
                10L, 80.0, 15.0, 70.0, 50.0, 3, 0, 80.0, 20, 4, "Blockchain", 50.0
        );
        ResponseStatusException exBadType = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(badType, auth)
        );
        assertEquals(HttpStatus.BAD_REQUEST, exBadType.getStatusCode());
        assertTrue(exBadType.getReason().contains("Project type must be one of"));

        verify(predictionRepository, never()).save(any());
    }

    @Test
    @DisplayName("9. AI service timeout or failure produces 503 Service Unavailable")
    void testAiServiceFailureProduces503() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI prediction service is unavailable"));

        PredictionRequest request = createValidRequest(10L);
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(request, auth)
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
        assertTrue(ex.getReason().contains("AI prediction service is unavailable"));
        verify(predictionRepository, never()).save(any());
    }

    @Test
    @DisplayName("10. Invalid AI response produces 502 Bad Gateway")
    void testInvalidAiResponseProduces502() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI service returned an invalid response"));

        PredictionRequest request = createValidRequest(10L);
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(request, auth)
        );

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        assertTrue(ex.getReason().contains("AI service returned an invalid response"));
        verify(predictionRepository, never()).save(any());
    }

    @Test
    @DisplayName("11. No prediction record saved when AI service fails")
    void testNoPredictionRecordSavedWhenAiFails() {
        Authentication auth = createAuth("studentA@college.edu", "STUDENT");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI prediction service is unavailable"));

        PredictionRequest request = createValidRequest(10L);

        assertThrows(
                ResponseStatusException.class,
                () -> predictionController.predict(request, auth)
        );

        verify(predictionRepository, never()).save(any(Prediction.class));
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("12. Faculty or Coordinator can predict and view history for any project")
    void testFacultyCanPredictAndViewHistory() {
        Authentication facultyAuth = createAuth("faculty@college.edu", "FACULTY");
        when(projectRepository.findById(10L)).thenReturn(Optional.of(projectA));
        when(aiPredictionService.predict(any(PredictionRequest.class)))
                .thenReturn(new PredictionResponse("LOW", 0.95));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(inv -> {
            Prediction p = inv.getArgument(0);
            p.setId(250L);
            return p;
        });

        PredictionRequest request = createValidRequest(10L);
        PredictionResultResponse response = predictionController.predict(request, facultyAuth);

        assertNotNull(response);
        assertEquals(250L, response.id());
        assertEquals("LOW", response.risk());
        verify(predictionRepository, times(1)).save(any(Prediction.class));
    }
}
