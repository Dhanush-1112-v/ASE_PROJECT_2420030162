package com.acadpredict.backend.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    public record Notification(
        String id, String title, String message,
        String category, boolean isRead
    ) {}

    @GetMapping
    public List<Notification> getNotifications() {
        return List.of(
            new Notification("notif-1", "Welcome to AcadPredict",
                "Your account is ready.", "System", false),
            new Notification("notif-2", "Risk Analysis Available",
                "Run a prediction to review project risk.",
                "System", false)
        );
    }
}
