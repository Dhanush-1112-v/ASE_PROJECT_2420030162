package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Document;
import java.time.format.DateTimeFormatter;

public record DocumentResponse(
    Long id,
    String name,
    String type,
    String size,
    long sizeBytes,
    String uploadedBy,
    String uploadDate,
    String status,
    String version,
    Long projectId
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");

    public static DocumentResponse from(Document doc) {
        if (doc == null) return null;

        String formattedDate = doc.getUploadDate() != null
            ? doc.getUploadDate().format(FORMATTER)
            : "";

        long bytes = doc.getFileSize() != null ? doc.getFileSize() : 0L;
        String formattedSize;
        if (bytes >= 1024 * 1024) {
            formattedSize = String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        } else if (bytes >= 1024) {
            formattedSize = String.format("%.1f KB", bytes / 1024.0);
        } else {
            formattedSize = bytes + " B";
        }

        return new DocumentResponse(
            doc.getId(),
            doc.getFilename(),
            doc.getFileType(),
            formattedSize,
            bytes,
            doc.getUploadedBy() != null ? doc.getUploadedBy() : "Student",
            formattedDate,
            doc.getStatus(),
            doc.getVersion(),
            doc.getProject() != null ? doc.getProject().getId() : null
        );
    }
}
