package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.PredictionRequest;
import com.acadpredict.backend.dto.PredictionResponse;
import com.acadpredict.backend.dto.PredictionResultResponse;
import com.acadpredict.backend.entity.Prediction;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.repository.PredictionRepository;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.service.AiPredictionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    private final AiPredictionService aiPredictionService;
    private final ProjectRepository projectRepository;
    private final PredictionRepository predictionRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public PredictionController(
            AiPredictionService aiPredictionService,
            ProjectRepository projectRepository,
            PredictionRepository predictionRepository) {
        this.aiPredictionService = aiPredictionService;
        this.projectRepository = projectRepository;
        this.predictionRepository = predictionRepository;
    }

    public PredictionController(AiPredictionService aiPredictionService) {
        this(aiPredictionService, null, null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PredictionResultResponse predict(
            @Valid @RequestBody PredictionRequest request,
            Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        if (request.projectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project ID is required");
        }

        return executePredictionAndPersist(request.projectId(), request, auth);
    }

    @PostMapping("/project/{projectId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PredictionResultResponse predictForProject(
            @PathVariable Long projectId,
            @Valid @RequestBody PredictionRequest request,
            Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        return executePredictionAndPersist(projectId, request, auth);
    }

    @GetMapping("/project/{projectId}")
    public List<PredictionResultResponse> getProjectPredictions(
            @PathVariable Long projectId,
            Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = (projectRepository != null)
                ? projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"))
                : null;

        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }

        boolean isStaff = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        if (predictionRepository == null) {
            return List.of();
        }

        return predictionRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(PredictionResultResponse::from)
                .toList();
    }

    private PredictionResultResponse executePredictionAndPersist(
            Long projectId,
            PredictionRequest request,
            Authentication auth) {

        if (request.projectType() != null && !List.of("Web", "AI", "Mobile", "Research", "IoT").contains(request.projectType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project type must be one of: Web, AI, Mobile, Research, IoT");
        }

        Project project = (projectRepository != null)
                ? projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"))
                : null;

        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }

        boolean isStaff = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        PredictionResponse aiResponse = aiPredictionService.predict(request);

        if (aiResponse == null || aiResponse.risk() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI service returned an invalid response");
        }

        Prediction prediction = new Prediction();
        prediction.setProject(project);
        prediction.setRisk(aiResponse.risk());
        prediction.setProbability(aiResponse.probability());
        prediction.setCreatedAt(LocalDateTime.now());

        Prediction saved = (predictionRepository != null)
                ? predictionRepository.save(prediction)
                : prediction;

        project.setDelayRisk(aiResponse.risk());
        project.setRiskProbability(aiResponse.probability());
        if (projectRepository != null) {
            projectRepository.save(project);
        }

        return PredictionResultResponse.from(saved);
    }
}
