"""
tests/test_all.py
==================
Basic automated tests for the AI-AcadPredict module.

Run from the ai-service/ directory:
    python -m pytest tests/ -v

Or without pytest:
    python -m tests.test_all
"""

import os
import sys
import json
import importlib

# Ensure the project root is on the path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def test_dataset_generation():
    """T1 & T2: Dataset generation works and has ~5000 rows."""
    from src.generate_dataset import generate_dataset
    df = generate_dataset()
    assert df.shape[0] == 5000, f"Expected 5000 rows, got {df.shape[0]}"
    assert df.shape[1] == 15, f"Expected 15 columns, got {df.shape[1]}"
    print("[PASS] T1/T2: Dataset generation and row count")


def test_missing_values_handled():
    """T3: Missing values exist in expected columns."""
    from src.generate_dataset import generate_dataset
    df = generate_dataset()
    cols_with_missing = [
        "attendance", "study_hours", "previous_performance",
        "milestone_completion", "project_progress",
    ]
    for col in cols_with_missing:
        assert df[col].isnull().sum() > 0, f"Expected missing values in {col}"
    # project_id and delay_risk must have NO missing
    assert df["project_id"].isnull().sum() == 0
    assert df["delay_risk"].isnull().sum() == 0
    print("[PASS] T3: Missing values present where expected")


def test_model_training_and_pkl():
    """T4 & T5: model.pkl exists (assumes train_model has been run)."""
    model_path = os.path.join(PROJECT_ROOT, "models", "model.pkl")
    assert os.path.exists(model_path), (
        f"model.pkl not found at {model_path}. Run `python -m src.train_model` first."
    )
    print("[PASS] T4/T5: model.pkl exists")


def test_model_can_load():
    """T6: model.pkl can be loaded with joblib."""
    import joblib
    model_path = os.path.join(PROJECT_ROOT, "models", "model.pkl")
    model = joblib.load(model_path)
    assert hasattr(model, "predict"), "Loaded object has no predict method"
    assert hasattr(model, "predict_proba"), "Loaded object has no predict_proba method"
    print("[PASS] T6: Model loads successfully")


def test_evaluation_files_exist():
    """T7 & T8: Evaluation files and confusion matrix image exist."""
    report_path = os.path.join(PROJECT_ROOT, "results", "metrics", "classification_report.txt")
    json_path = os.path.join(PROJECT_ROOT, "results", "metrics", "metrics.json")
    plot_path = os.path.join(PROJECT_ROOT, "results", "plots", "confusion_matrix.png")

    assert os.path.exists(report_path), f"Missing: {report_path}"
    assert os.path.exists(json_path), f"Missing: {json_path}"
    assert os.path.exists(plot_path), f"Missing: {plot_path}"

    # Validate JSON structure
    with open(json_path) as f:
        metrics = json.load(f)
    assert "accuracy" in metrics
    assert "confusion_matrix" in metrics
    print("[PASS] T7/T8: Evaluation files and confusion matrix plot exist")


def test_fastapi_app_imports():
    """T9: FastAPI app can be imported."""
    from src.main import app
    assert app is not None
    assert app.title == "AI-AcadPredict — Delay Risk Prediction API"
    print("[PASS] T9: FastAPI app imports successfully")


def test_prediction_schema_valid():
    """T11/T13: Valid input produces correct output format."""
    from src.schemas import PredictionRequest, PredictionResponse

    req = PredictionRequest(
        attendance=70,
        studyHours=15,
        previousPerformance=65,
        taskCompletion=50,
        pendingTasks=7,
        missedDeadlines=2,
        milestoneCompletion=40,
        daysRemaining=10,
        teamSize=4,
        projectType="AI",
        projectProgress=45,
    )
    d = req.to_model_dict()
    assert d["study_hours"] == 15
    assert d["project_type"] == "AI"
    print("[PASS] T11/T13: PredictionRequest schema and to_model_dict work")


def test_prediction_schema_invalid():
    """T12: Invalid input raises a validation error."""
    from src.schemas import PredictionRequest
    from pydantic import ValidationError

    try:
        PredictionRequest(
            attendance=150,          # > 100 → invalid
            studyHours=15,
            previousPerformance=65,
            taskCompletion=50,
            pendingTasks=7,
            missedDeadlines=2,
            milestoneCompletion=40,
            daysRemaining=10,
            teamSize=4,
            projectType="AI",
            projectProgress=45,
        )
        assert False, "Should have raised ValidationError"
    except ValidationError:
        pass
    print("[PASS] T12: Invalid input correctly rejected")


def test_model_prediction_output():
    """T14/T15: Prediction probability is [0,1] and risk is LOW/MEDIUM/HIGH."""
    import joblib
    import pandas as pd

    model_path = os.path.join(PROJECT_ROOT, "models", "model.pkl")
    model = joblib.load(model_path)

    sample = pd.DataFrame([{
        "attendance": 70,
        "study_hours": 15,
        "previous_performance": 65,
        "task_completion": 50,
        "pending_tasks": 7,
        "missed_deadlines": 2,
        "milestone_completion": 40,
        "days_remaining": 10,
        "team_size": 4,
        "project_type": "AI",
        "project_progress": 45,
    }])

    pred = model.predict(sample)[0]
    proba = model.predict_proba(sample)[0]

    assert pred in {"LOW", "MEDIUM", "HIGH"}, f"Unexpected risk: {pred}"
    assert all(0 <= p <= 1 for p in proba), "Probability out of [0,1]"
    print(f"[PASS] T14/T15: risk={pred}, probabilities={[round(p,4) for p in proba]}")


def test_api_get_root():
    """T10: GET / returns a valid response."""
    try:
        from fastapi.testclient import TestClient
    except ImportError:
        print("[SKIP] T10: fastapi.testclient not available (install httpx)")
        return
    from src.main import app
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "message" in data
    print("[PASS] T10: GET / returns 200 with message")


def test_api_post_predict():
    """T11a: POST /predict with valid data returns correct format."""
    try:
        from fastapi.testclient import TestClient
    except ImportError:
        print("[SKIP] T11a: fastapi.testclient not available (install httpx)")
        return
    from src.main import app
    client = TestClient(app)
    payload = {
        "attendance": 70,
        "studyHours": 15,
        "previousPerformance": 65,
        "taskCompletion": 50,
        "pendingTasks": 7,
        "missedDeadlines": 2,
        "milestoneCompletion": 40,
        "daysRemaining": 10,
        "teamSize": 4,
        "projectType": "AI",
        "projectProgress": 45,
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "risk" in data, "Response missing 'risk'"
    assert "probability" in data, "Response missing 'probability'"
    assert data["risk"] in {"LOW", "MEDIUM", "HIGH"}, f"Unexpected risk: {data['risk']}"
    assert 0 <= data["probability"] <= 1, f"Probability out of range: {data['probability']}"
    print(f"[PASS] T11a: POST /predict -> risk={data['risk']}, prob={data['probability']}")


def test_api_post_predict_invalid():
    """T12a: POST /predict with invalid data returns 422."""
    try:
        from fastapi.testclient import TestClient
    except ImportError:
        print("[SKIP] T12a: fastapi.testclient not available (install httpx)")
        return
    from src.main import app
    client = TestClient(app)
    payload = {"attendance": 150}  # invalid + missing fields
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
    print("[PASS] T12a: Invalid API input correctly returns 422")


# ---------------------------------------------------------------------------
# Runner (no pytest needed)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    tests = [
        test_dataset_generation,
        test_missing_values_handled,
        test_model_training_and_pkl,
        test_model_can_load,
        test_evaluation_files_exist,
        test_fastapi_app_imports,
        test_prediction_schema_valid,
        test_prediction_schema_invalid,
        test_model_prediction_output,
        test_api_get_root,
        test_api_post_predict,
        test_api_post_predict_invalid,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"[FAIL] {t.__name__}: {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    print(f"{'='*40}")
    sys.exit(1 if failed else 0)
