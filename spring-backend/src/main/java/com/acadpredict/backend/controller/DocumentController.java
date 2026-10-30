package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.DocumentResponse;
import com.acadpredict.backend.entity.Document;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.repository.DocumentRepository;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.service.DocumentStorageService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class DocumentController {

    private static final long MAX_FILE_SIZE_BYTES = 15L * 1024 * 1024; // 15 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".csv", ".json", ".zip", ".png", ".jpg", ".jpeg"
    );

    private final DocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final DocumentStorageService documentStorageService;

    public DocumentController(
        DocumentRepository documentRepository,
        ProjectRepository projectRepository,
        DocumentStorageService documentStorageService
    ) {
        this.documentRepository = documentRepository;
        this.projectRepository = projectRepository;
        this.documentStorageService = documentStorageService;
    }

    private void checkProjectAccess(Project project, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));
        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }
    }

    @GetMapping("/projects/{projectId}/documents")
    public List<DocumentResponse> getProjectDocuments(@PathVariable Long projectId, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        checkProjectAccess(project, auth);

        return documentRepository.findByProjectId(projectId).stream()
            .map(DocumentResponse::from)
            .toList();
    }

    @PostMapping(value = "/projects/{projectId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse uploadDocument(
        @PathVariable Long projectId,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "title", required = false) String title,
        @RequestParam(value = "category", required = false) String category,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        checkProjectAccess(project, auth);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required and cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds the 15 MB maximum limit");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.bin";
        String ext = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex != -1) {
            ext = originalFilename.substring(dotIndex).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(ext) && !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File type not supported. Allowed formats: PDF, DOC/DOCX, PPT/PPTX, TXT, CSV, JSON, ZIP, PNG, JPG");
        }

        String finalName = (title != null && !title.isBlank())
            ? (title.contains(".") ? title.trim() : title.trim() + ext)
            : originalFilename;

        String fileType = category != null && !category.isBlank() ? category : "Project File";
        if (finalName.toLowerCase().endsWith(".pdf")) fileType = "PDF Document";
        else if (finalName.toLowerCase().endsWith(".docx") || finalName.toLowerCase().endsWith(".doc")) fileType = "Word Document";
        else if (finalName.toLowerCase().endsWith(".pptx") || finalName.toLowerCase().endsWith(".ppt")) fileType = "Presentation";
        else if (finalName.toLowerCase().endsWith(".zip")) fileType = "Archive";

        // Store file in configured filesystem directory first
        String storageKey;
        try {
            storageKey = documentStorageService.storeFile(file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file on disk: " + e.getMessage());
        }

        // Prepare document entity with metadata and storageKey (no binary in MySQL)
        Document document = new Document();
        document.setFilename(finalName);
        document.setFileType(fileType);
        document.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        document.setFileSize(file.getSize());
        document.setUploadedBy(auth.getName());
        document.setStatus("Pending Review");
        document.setVersion("v1.0");
        document.setProject(project);
        document.setStorageKey(storageKey);
        document.setData(null); // File bytes stored on disk, not in MySQL

        try {
            Document saved = documentRepository.save(document);
            return DocumentResponse.from(saved);
        } catch (Exception ex) {
            // Clean up stored file to prevent orphaned storage if DB transaction fails
            documentStorageService.deleteFile(storageKey);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to persist document metadata: " + ex.getMessage());
        }
    }

    @GetMapping("/documents/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        checkProjectAccess(document.getProject(), auth);

        Resource resource = null;
        long contentLength = 0L;

        // Try filesystem storage first
        if (document.getStorageKey() != null && !document.getStorageKey().isBlank()) {
            resource = documentStorageService.loadFileAsResource(document.getStorageKey());
            if (resource != null && resource.exists()) {
                try {
                    contentLength = resource.contentLength();
                } catch (IOException ignored) {
                    contentLength = document.getFileSize() != null ? document.getFileSize() : 0L;
                }
            }
        }

        // Backward compatibility fallback for legacy records stored as LONGBLOB
        if (resource == null || !resource.exists()) {
            byte[] legacyData = document.getData();
            if (legacyData != null && legacyData.length > 0) {
                resource = new ByteArrayResource(legacyData);
                contentLength = legacyData.length;
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document file content is unavailable or deleted");
            }
        }

        String filename = document.getFilename() != null ? document.getFilename() : "document.bin";
        String safeFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(document.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFilename + "\"")
            .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
            .contentType(mediaType)
            .contentLength(contentLength)
            .body(resource);
    }

    @DeleteMapping("/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        checkProjectAccess(document.getProject(), auth);

        String storageKey = document.getStorageKey();

        // Remove from database
        documentRepository.delete(document);

        // Remove from disk storage if key present
        if (storageKey != null && !storageKey.isBlank()) {
            documentStorageService.deleteFile(storageKey);
        }
    }
}
