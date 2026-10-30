package com.acadpredict.backend.config;

import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Opt-in Development Account Initializer.
 * Safely provisions verified test accounts for FACULTY and COORDINATOR roles
 * only when explicitly enabled via app.dev.provision-accounts=true.
 * Disabled by default in production.
 */
@Component
@ConditionalOnProperty(name = "app.dev.provision-accounts", havingValue = "true", matchIfMissing = false)
public class DevAccountInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAccountInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev.faculty-email:faculty@college.edu}")
    private String facultyEmail;

    @Value("${app.dev.faculty-password:FacultyPass123!}")
    private String facultyPassword;

    @Value("${app.dev.faculty-name:Dr. Sharma}")
    private String facultyName;

    @Value("${app.dev.coordinator-email:coordinator@college.edu}")
    private String coordinatorEmail;

    @Value("${app.dev.coordinator-password:CoordinatorPass123!}")
    private String coordinatorPassword;

    @Value("${app.dev.coordinator-name:Prof. Williams}")
    private String coordinatorName;

    public DevAccountInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        log.info("Opt-in Development Role Provisioning is active.");
        provisionAccount(facultyEmail, facultyName, facultyPassword, Role.FACULTY);
        provisionAccount(coordinatorEmail, coordinatorName, coordinatorPassword, Role.COORDINATOR);
    }

    private void provisionAccount(String email, String name, String rawPassword, Role role) {
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            log.info("Account with email '{}' already exists in database; skipping dev provisioning.", normalizedEmail);
            return;
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setName(name);
        user.setRole(role);
        user.setPassword(passwordEncoder.encode(rawPassword));

        userRepository.save(user);
        log.info("Successfully provisioned dev {} account: {}", role, normalizedEmail);
    }
}
