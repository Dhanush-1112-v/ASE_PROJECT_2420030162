"""
train_model.py
===============
End-to-end training script:
  1. Load & prepare data
  2. Stratified 80/20 split
  3. Train the Random Forest pipeline
  4. Evaluate on the held-out test set
  5. Save metrics, classification report, confusion-matrix plot
  6. Save the trained pipeline to models/model.pkl

Run from the ai-service/ directory:
    python -m src.train_model
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # non-interactive backend — safe for scripts
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

from src.preprocessing import load_and_prepare, build_pipeline

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
METRICS_DIR = os.path.join(BASE_DIR, "results", "metrics")
PLOTS_DIR = os.path.join(BASE_DIR, "results", "plots")

RANDOM_STATE = 42
TEST_SIZE = 0.20


def train_and_evaluate():
    """Run the full training + evaluation workflow."""

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    print("=" * 60)
    print("STEP 1 - Loading and preparing data")
    print("=" * 60)
    X, y = load_and_prepare()
    print(f"Features shape : {X.shape}")
    print(f"Target shape   : {y.shape}")
    print(f"Class distribution:\n{y.value_counts().to_string()}\n")

    # ------------------------------------------------------------------
    # 2. Train / test split (80/20, stratified)
    # ------------------------------------------------------------------
    print("=" * 60)
    print("STEP 2 - Splitting data (80 % train / 20 % test, stratified)")
    print("=" * 60)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    print(f"Train size : {X_train.shape[0]}")
    print(f"Test  size : {X_test.shape[0]}\n")

    # ------------------------------------------------------------------
    # 3. Build & train the pipeline
    # ------------------------------------------------------------------
    print("=" * 60)
    print("STEP 3 - Training the Random Forest pipeline")
    print("=" * 60)
    pipeline = build_pipeline(random_state=RANDOM_STATE)
    pipeline.fit(X_train, y_train)
    print("Training complete.\n")

    # ------------------------------------------------------------------
    # 4. Cross-validation (5-fold) on training data
    # ------------------------------------------------------------------
    print("=" * 60)
    print("STEP 4 - 5-fold cross-validation on training data")
    print("=" * 60)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="accuracy")
    print(f"CV accuracy scores : {np.round(cv_scores, 4)}")
    print(f"CV mean accuracy   : {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}\n")

    # ------------------------------------------------------------------
    # 5. Evaluate on the test set
    # ------------------------------------------------------------------
    print("=" * 60)
    print("STEP 5 - Evaluating on the test set")
    print("=" * 60)
    y_pred = pipeline.predict(X_test)
    labels = ["LOW", "MEDIUM", "HIGH"]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    report_str = classification_report(
        y_test, y_pred, target_names=labels, zero_division=0
    )
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    print(f"Accuracy  : {acc:.4f}")
    print(f"Precision : {prec:.4f}  (weighted)")
    print(f"Recall    : {rec:.4f}  (weighted)")
    print(f"F1-score  : {f1:.4f}  (weighted)\n")
    print("Classification Report:")
    print(report_str)
    print("Confusion Matrix:")
    print(cm)

    # ------------------------------------------------------------------
    # Metric explanations
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("METRIC EXPLANATIONS")
    print("=" * 60)
    print("""
Precision  - Of all projects predicted as a given risk level,
             what fraction actually belong to that level?
             High precision means fewer FALSE POSITIVES.

Recall     - Of all projects that truly belong to a risk level,
             what fraction did the model correctly identify?
             High recall means fewer FALSE NEGATIVES.

F1-score   - Harmonic mean of precision and recall.
             Balances both concerns.

False Positive (FP)
    The model predicts HIGH risk, but the project is actually LOW/MEDIUM.
    -> May cause unnecessary concern or resource reallocation.

False Negative (FN)
    The model predicts LOW risk, but the project is actually HIGH risk.
    -> Risky because the delay goes undetected.
""")

    # ------------------------------------------------------------------
    # 6. Save metrics
    # ------------------------------------------------------------------
    os.makedirs(METRICS_DIR, exist_ok=True)

    # 6a. Classification report (text)
    report_path = os.path.join(METRICS_DIR, "classification_report.txt")
    with open(report_path, "w") as f:
        f.write("Classification Report\n")
        f.write("=" * 50 + "\n\n")
        f.write(report_str)
        f.write(f"\nAccuracy  : {acc:.4f}\n")
        f.write(f"Precision : {prec:.4f}  (weighted)\n")
        f.write(f"Recall    : {rec:.4f}  (weighted)\n")
        f.write(f"F1-score  : {f1:.4f}  (weighted)\n")
        f.write(f"\nConfusion Matrix:\n{cm}\n")
        f.write(f"\nCV mean accuracy: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}\n")
        f.write(
            "\nNOTE: These scores are based on a SYNTHETIC dataset.\n"
            "High scores may reflect the deterministic label-generation\n"
            "rules and do NOT guarantee real-world performance.\n"
        )
    print(f"\n[OK] Classification report saved to: {report_path}")

    # 6b. Metrics JSON
    metrics_json_path = os.path.join(METRICS_DIR, "metrics.json")
    metrics_dict = {
        "accuracy": round(acc, 4),
        "precision_weighted": round(prec, 4),
        "recall_weighted": round(rec, 4),
        "f1_weighted": round(f1, 4),
        "cv_mean_accuracy": round(cv_scores.mean(), 4),
        "cv_std_accuracy": round(cv_scores.std(), 4),
        "confusion_matrix": cm.tolist(),
        "labels": labels,
        "test_size": X_test.shape[0],
        "train_size": X_train.shape[0],
        "note": (
            "Scores are based on synthetic data. "
            "They do not guarantee real-world accuracy."
        ),
    }
    with open(metrics_json_path, "w") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"[OK] Metrics JSON saved to: {metrics_json_path}")

    # ------------------------------------------------------------------
    # 7. Save confusion matrix plot
    # ------------------------------------------------------------------
    os.makedirs(PLOTS_DIR, exist_ok=True)
    plot_path = os.path.join(PLOTS_DIR, "confusion_matrix.png")

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels,
        ax=ax,
    )
    ax.set_title("Confusion Matrix - Project Delay Risk", fontsize=14)
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("True Label", fontsize=12)
    fig.tight_layout()
    fig.savefig(plot_path, dpi=150)
    plt.close(fig)
    print(f"[OK] Confusion matrix plot saved to: {plot_path}")

    # ------------------------------------------------------------------
    # 8. Save the trained pipeline
    # ------------------------------------------------------------------
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"[OK] Trained pipeline saved to: {MODEL_PATH}")

    # ------------------------------------------------------------------
    # 9. Quick load-and-predict sanity check
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SANITY CHECK - Load model & predict on first test row")
    print("=" * 60)
    loaded = joblib.load(MODEL_PATH)
    sample = X_test.iloc[:1]
    pred = loaded.predict(sample)[0]
    proba = loaded.predict_proba(sample)[0]
    class_labels = loaded.classes_
    pred_idx = list(class_labels).index(pred)
    print(f"Input        : {sample.to_dict(orient='records')[0]}")
    print(f"Predicted    : {pred}")
    print(f"Probabilities: { {c: round(p, 4) for c, p in zip(class_labels, proba)} }")
    print(f"Prob of predicted class: {proba[pred_idx]:.4f}")

    if acc > 0.90:
        print(
            "\n[!] NOTE: Test accuracy > 90 %.  This is likely because the\n"
            "  synthetic labels were derived from the same features via a\n"
            "  deterministic formula.  Real-world accuracy will differ."
        )

    print("\n[OK] Training pipeline finished successfully.")


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    train_and_evaluate()
