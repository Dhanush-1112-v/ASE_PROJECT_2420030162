"""
preprocessing.py
=================
Builds a scikit-learn Pipeline that encapsulates:
  1. Median imputation  → numerical features
  2. Most-frequent imputation + one-hot encoding → categorical features
  3. Random Forest Classifier

The pipeline is self-contained: the saved model.pkl file includes ALL
preprocessing steps, so inference never requires separate transforms.

Functions
---------
build_pipeline()       → sklearn.pipeline.Pipeline
load_and_prepare()     → (X, y, feature_names)
get_feature_lists()    → (numerical_features, categorical_features)
"""

import os
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier

# ---------------------------------------------------------------------------
# Feature definitions
# ---------------------------------------------------------------------------

NUMERICAL_FEATURES = [
    "attendance",
    "study_hours",
    "previous_performance",
    "task_completion",
    "pending_tasks",
    "missed_deadlines",
    "milestone_completion",
    "days_remaining",
    "team_size",
    "project_progress",
]

CATEGORICAL_FEATURES = [
    "project_type",
]

ALL_INPUT_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

TARGET = "delay_risk"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "data", "raw", "project_delay_risk_synthetic_5000.csv")


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_feature_lists():
    """Return (numerical_features, categorical_features)."""
    return NUMERICAL_FEATURES, CATEGORICAL_FEATURES


def load_and_prepare(path: str = DATASET_PATH):
    """Load the CSV and return (X, y).

    Parameters
    ----------
    path : str
        Path to the raw CSV file.

    Returns
    -------
    X : pd.DataFrame   – input features only (no project_id, no target)
    y : pd.Series       – target labels (LOW / MEDIUM / HIGH)
    """
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset not found at '{path}'.  "
            "Run `python -m src.generate_dataset` first."
        )

    df = pd.read_csv(path)

    # Basic inspection
    print(f"Loaded dataset: {df.shape[0]} rows × {df.shape[1]} columns")
    print(f"Missing values:\n{df.isnull().sum()[df.isnull().sum() > 0].to_string()}")

    X = df[ALL_INPUT_FEATURES].copy()
    y = df[TARGET].copy()

    return X, y


def build_pipeline(random_state: int = 42) -> Pipeline:
    """Return a complete sklearn Pipeline (preprocessing + classifier).

    Preprocessing
    -------------
    • Numerical  → SimpleImputer(strategy='median')
    • Categorical → SimpleImputer(strategy='most_frequent')
                    + OneHotEncoder(handle_unknown='ignore')

    Classifier
    ----------
    RandomForestClassifier with sensible defaults.
    """

    # --- Numerical transformer ---
    num_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
    ])

    # --- Categorical transformer ---
    cat_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    # --- Column transformer ---
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_transformer, NUMERICAL_FEATURES),
            ("cat", cat_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",  # drop any extra columns
    )

    # --- Full pipeline ---
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=300,
            max_depth=20,
            min_samples_split=4,
            min_samples_leaf=1,
            random_state=random_state,
            n_jobs=-1,
        )),
    ])

    return pipeline
