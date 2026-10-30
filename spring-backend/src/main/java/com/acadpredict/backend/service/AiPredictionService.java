
package com.acadpredict.backend.service;

import com.acadpredict.backend.dto.PredictionRequest;
import com.acadpredict.backend.dto.PredictionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AiPredictionService {

    private final RestClient restClient;

    public AiPredictionService(
            RestClient.Builder builder,
            @Value("${ai.service.base-url:http://localhost:8000}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public PredictionResponse predict(PredictionRequest request) {
        try {
            PredictionResponse response = restClient.post()
                    .uri("/predict")
                    .body(request.toAiPayload())
                    .retrieve()
                    .body(PredictionResponse.class);

            if (response == null || response.risk() == null || response.risk().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "AI service returned an invalid or empty response"
                );
            }

            String risk = response.risk().trim().toUpperCase();
            if (!List.of("LOW", "MEDIUM", "HIGH").contains(risk)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "AI service returned unknown risk category: " + response.risk()
                );
            }

            return new PredictionResponse(risk, response.probability());

        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI prediction service is unavailable",
                    ex
            );
        }
    }
}
