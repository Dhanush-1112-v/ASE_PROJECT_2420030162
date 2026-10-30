"""
main.py
========
FastAPI application for the AI-AcadPredict delay-risk prediction API.

Endpoints
---------
GET  /         → welcome / status message
GET  /health   → health check (confirms model is loaded)
POST /predict  → accepts project data, returns risk + probability

The trained pipeline (models/model.pkl) is loaded once at startup.
It contains ALL preprocessing steps, so no separate transformation
code is needed here.

Run from the ai-service/ directory:
    uvicorn src.main:app --reload
"""

import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException

from src.schemas import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
    VALID_PROJECT_TYPES,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "model.pkl")

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI-AcadPredict — Delay Risk Prediction API",
    description=(
        "Predicts the risk of academic project delay (LOW / MEDIUM / HIGH) "
        "using a trained Random Forest pipeline."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
model = None


def load_model():
    """Load the trained pipeline."""
    global model
    if not os.path.exists(MODEL_PATH):
        print(
            f"[!] WARNING: Model file not found at '{MODEL_PATH}'.  "
            "POST /predict will return 503 until a model is available.  "
            "Run `python -m src.train_model` first."
        )
        return None
    try:
        model = joblib.load(MODEL_PATH)
        print(f"[OK] Model loaded from {MODEL_PATH}")
        return model
    except Exception as exc:
        print(f"[X] Failed to load model: {exc}")
        model = None
        return None


def get_model():
    """Return the cached model or attempt to load it on demand."""
    global model
    if model is None:
        load_model()
    return model


@app.on_event("startup")
def on_startup():
    load_model()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Status"])
def root():
    """Welcome / health message."""
    return {
        "message": "AI-AcadPredict Delay Risk Prediction API is running.",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["Status"])
def health():
    """Health-check endpoint."""
    current_model = get_model()
    return HealthResponse(
        status="healthy" if current_model is not None else "model_not_loaded",
        model_loaded=current_model is not None,
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(payload: PredictionRequest):
    """Predict the delay-risk level for a project.

    **Probability interpretation**:
    The returned ``probability`` is the model's confidence for the
    *predicted* class (not necessarily the probability of HIGH risk).

    **Supported project types**: Web, AI, Mobile, Research, IoT.
    Unknown types are handled safely by the model's OneHotEncoder
    (``handle_unknown='ignore'``), but may degrade prediction quality.
    """
    current_model = get_model()

    # --- Guard: model must be loaded ---
    if current_model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model is not loaded. "
                "Train the model first with `python -m src.train_model`."
            ),
        )

    # --- Validate project_type ---
    if payload.project_type not in VALID_PROJECT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid projectType '{payload.project_type}'. "
                f"Supported values: {sorted(VALID_PROJECT_TYPES)}"
            ),
        )

    # --- Build a single-row DataFrame with training feature names ---
    try:
        input_dict = payload.to_model_dict()
        input_df = pd.DataFrame([input_dict])

        # Predict class & probabilities
        predicted_class = current_model.predict(input_df)[0]
        probabilities = current_model.predict_proba(input_df)[0]

        # Find probability for the predicted class
        class_labels = list(current_model.classes_)
        pred_idx = class_labels.index(predicted_class)
        pred_probability = round(float(probabilities[pred_idx]), 4)

        return PredictionResponse(
            risk=predicted_class,
            probability=pred_probability,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {exc}",
        )
