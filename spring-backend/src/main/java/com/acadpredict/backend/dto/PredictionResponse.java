
package com.acadpredict.backend.dto;

public record PredictionResponse(
    String risk,
    double probability
) {}
