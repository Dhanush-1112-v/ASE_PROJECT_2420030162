# Stage 1: Build Java 21 Spring Boot application with Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application sources and build jar without running tests
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime environment with lightweight JRE
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root system user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create document uploads storage directory with appuser permissions
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

# Copy jar artifact from builder
COPY --from=builder /app/target/*.jar app.jar

USER appuser

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
