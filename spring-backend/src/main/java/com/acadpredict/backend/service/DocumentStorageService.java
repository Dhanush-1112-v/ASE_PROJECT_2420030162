package com.acadpredict.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class DocumentStorageService {

    private static final Logger log = LoggerFactory.getLogger(DocumentStorageService.class);

    @Value("${app.document.storage-dir:/app/uploads}")
    private String configuredStorageDir;

    private Path storageLocation;

    @PostConstruct
    public void init() {
        try {
            Path targetPath = Paths.get(configuredStorageDir).toAbsolutePath().normalize();
            Files.createDirectories(targetPath);
            this.storageLocation = targetPath;
            log.info("Document storage initialized at: {}", this.storageLocation);
        } catch (Exception ex) {
            log.warn("Could not create configured storage directory '{}': {}. Falling back to local ./uploads directory.",
                configuredStorageDir, ex.getMessage());
            try {
                Path fallbackPath = Paths.get("uploads").toAbsolutePath().normalize();
                Files.createDirectories(fallbackPath);
                this.storageLocation = fallbackPath;
                log.info("Document storage fallback initialized at: {}", this.storageLocation);
            } catch (IOException ioException) {
                throw new RuntimeException("Could not initialize storage directory fallback", ioException);
            }
        }
    }

    /**
     * Store an uploaded multipart file to the filesystem under a safe, unique storage key.
     *
     * @param file the uploaded file
     * @return the unique generated storage key
     * @throws IOException if writing to filesystem fails
     */
    public String storeFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        String originalFilename = file.getOriginalFilename();
        String safeName = sanitizeFilename(originalFilename);
        String storageKey = UUID.randomUUID().toString() + "_" + safeName;

        Path targetLocation = resolveAndValidate(storageKey);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        log.debug("Stored file '{}' with storage key '{}' at {}", originalFilename, storageKey, targetLocation);
        return storageKey;
    }

    /**
     * Store raw bytes directly to disk (used for legacy migration or test operations).
     */
    public String storeBytes(byte[] data, String originalFilename) throws IOException {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Cannot store empty data.");
        }
        String safeName = sanitizeFilename(originalFilename);
        String storageKey = UUID.randomUUID().toString() + "_" + safeName;
        Path targetLocation = resolveAndValidate(storageKey);
        Files.write(targetLocation, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return storageKey;
    }

    /**
     * Load a file as a Spring Resource from the filesystem.
     *
     * @param storageKey the unique storage key
     * @return the Resource, or null if file does not exist
     */
    public Resource loadFileAsResource(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }

        try {
            Path filePath = resolveAndValidate(storageKey);
            if (Files.exists(filePath) && Files.isReadable(filePath)) {
                Resource resource = new UrlResource(filePath.toUri());
                if (resource.exists() && resource.isReadable()) {
                    return resource;
                }
            }
        } catch (MalformedURLException | SecurityException ex) {
            log.warn("Failed to load resource for storage key '{}': {}", storageKey, ex.getMessage());
        }
        return null;
    }

    /**
     * Delete a file from the filesystem.
     *
     * @param storageKey the unique storage key
     * @return true if deleted or did not exist, false if deletion failed
     */
    public boolean deleteFile(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return true;
        }

        try {
            Path filePath = resolveAndValidate(storageKey);
            return Files.deleteIfExists(filePath);
        } catch (IOException | SecurityException ex) {
            log.error("Failed to delete file with storage key '{}': {}", storageKey, ex.getMessage());
            return false;
        }
    }

    /**
     * Check if a file exists on disk for a given storage key.
     */
    public boolean fileExists(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return false;
        }
        try {
            Path filePath = resolveAndValidate(storageKey);
            return Files.exists(filePath) && Files.isRegularFile(filePath);
        } catch (Exception ex) {
            return false;
        }
    }

    /**
     * Resolve a storage key against the base storage location and verify it does not escape.
     */
    public Path resolveAndValidate(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("Storage key cannot be null or empty");
        }
        Path filePath = this.storageLocation.resolve(storageKey).normalize();
        if (!filePath.startsWith(this.storageLocation)) {
            throw new SecurityException("Path traversal attempt detected with key: " + storageKey);
        }
        return filePath;
    }

    /**
     * Sanitize an incoming filename to prevent directory traversal and remove unsafe chars.
     */
    public String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "document.bin";
        }
        // Extract simple filename (strips any leading paths like ../ or C:\)
        String simpleName = Paths.get(filename).getFileName().toString();
        // Replace all characters except alphanumeric, dots, underscores, and dashes
        String clean = simpleName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.isEmpty() ? "document.bin" : clean;
    }

    public Path getStorageLocation() {
        return storageLocation;
    }
}
