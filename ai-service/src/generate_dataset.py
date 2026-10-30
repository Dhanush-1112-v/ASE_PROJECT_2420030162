"""
generate_dataset.py
====================
Generates a synthetic dataset for academic project delay-risk prediction.

* 5 000 records with 14 features + 1 target (delay_risk).
* Reproducible via RANDOM_SEED = 42.
* Features are generated using class-conditional distributions so that
  each risk level (LOW, MEDIUM, HIGH) has a distinct but overlapping
  feature profile.  This produces realistic data where a Random Forest
  can achieve ~89-90 % accuracy.
* A small fraction of missing values is injected into selected numeric
  columns so the preprocessing pipeline can be tested.

NOTE: This dataset is **synthetic** and is intended ONLY for prototype
development.  High evaluation scores do NOT guarantee real-world model
accuracy.
"""

import os
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANDOM_SEED = 42
N_SAMPLES = 5000
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "raw")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "project_delay_risk_synthetic_5000.csv")

PROJECT_TYPES = ["Web", "AI", "Mobile", "Research", "IoT"]

# Class sizes (roughly balanced)
N_LOW = 1700
N_MEDIUM = 1650
N_HIGH = N_SAMPLES - N_LOW - N_MEDIUM  # 1650


def _generate_class_features(rng, n, risk_level):
    """Generate features for a single risk class.

    Each risk level draws features from different distribution
    parameters, enforcing logical relationships:
      - LOW risk  -> high attendance, high completion, few missed deadlines
      - HIGH risk -> low attendance, low completion, many missed deadlines
      - MEDIUM    -> intermediate values with overlap into both extremes

    Parameters
    ----------
    rng : np.random.RandomState
    n   : int  - number of samples to generate
    risk_level : str  - "LOW", "MEDIUM", or "HIGH"

    Returns
    -------
    dict of arrays, one per feature column
    """
    # Distribution parameters per class: (mean, std)
    params = {
        "LOW": {
            "attendance":            (82, 10),
            "study_hours":           (20, 6),
            "previous_performance":  (75, 12),
            "task_completion_pct":   (0.72, 0.15),
            "missed_deadlines_lam":  1.0,
            "milestone_completion":  (72, 15),
            "days_remaining":        (48, 20),
            "project_progress":      (68, 15),
        },
        "MEDIUM": {
            "attendance":            (72, 12),
            "study_hours":           (14, 6),
            "previous_performance":  (62, 14),
            "task_completion_pct":   (0.50, 0.16),
            "missed_deadlines_lam":  2.5,
            "milestone_completion":  (50, 16),
            "days_remaining":        (35, 20),
            "project_progress":      (48, 16),
        },
        "HIGH": {
            "attendance":            (62, 13),
            "study_hours":           (9, 5),
            "previous_performance":  (50, 15),
            "task_completion_pct":   (0.30, 0.15),
            "missed_deadlines_lam":  4.0,
            "milestone_completion":  (32, 16),
            "days_remaining":        (22, 16),
            "project_progress":      (28, 15),
        },
    }
    p = params[risk_level]

    attendance = rng.normal(*p["attendance"], n).clip(0, 100).round(1)
    study_hours = rng.normal(*p["study_hours"], n).clip(1, 40).round(1)
    previous_performance = rng.normal(*p["previous_performance"], n).clip(0, 100).round(1)

    planned_tasks = rng.randint(5, 30, n)
    # Task completion fraction varies by class
    tc_mean, tc_std = p["task_completion_pct"]
    completion_frac = rng.normal(tc_mean, tc_std, n).clip(0.0, 1.0)
    completed_tasks = (planned_tasks * completion_frac).astype(int).clip(0)
    completed_tasks = np.minimum(completed_tasks, planned_tasks)
    task_completion = np.where(
        planned_tasks > 0,
        (completed_tasks / planned_tasks * 100).round(1),
        0.0,
    )
    pending_tasks = planned_tasks - completed_tasks

    missed_deadlines = rng.poisson(p["missed_deadlines_lam"], n).clip(0, 15)
    milestone_completion = rng.normal(*p["milestone_completion"], n).clip(0, 100).round(1)
    days_remaining = rng.normal(*p["days_remaining"], n).clip(1, 90).astype(int)
    team_size = rng.randint(1, 8, n)
    project_type = rng.choice(PROJECT_TYPES, n)
    project_progress = rng.normal(*p["project_progress"], n).clip(0, 100).round(1)

    return {
        "attendance": attendance,
        "study_hours": study_hours,
        "previous_performance": previous_performance,
        "task_completion": task_completion,
        "pending_tasks": pending_tasks,
        "missed_deadlines": missed_deadlines,
        "milestone_completion": milestone_completion,
        "days_remaining": days_remaining,
        "team_size": team_size,
        "project_type": project_type,
        "planned_tasks": planned_tasks,
        "completed_tasks": completed_tasks,
        "project_progress": project_progress,
    }


def generate_dataset() -> pd.DataFrame:
    """Generate and return the synthetic dataframe (5 000 rows)."""
    rng = np.random.RandomState(RANDOM_SEED)

    # --- Generate features per class using distinct distributions ---
    low_feats = _generate_class_features(rng, N_LOW, "LOW")
    med_feats = _generate_class_features(rng, N_MEDIUM, "MEDIUM")
    high_feats = _generate_class_features(rng, N_HIGH, "HIGH")

    # Combine into a single DataFrame
    dfs = []
    for feats, label, count in [
        (low_feats, "LOW", N_LOW),
        (med_feats, "MEDIUM", N_MEDIUM),
        (high_feats, "HIGH", N_HIGH),
    ]:
        df_part = pd.DataFrame(feats)
        df_part["delay_risk"] = label
        dfs.append(df_part)

    df = pd.concat(dfs, ignore_index=True)

    # Shuffle the rows (deterministically)
    df = df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    # Add project IDs
    df.insert(0, "project_id", [f"PROJ-{i+1:04d}" for i in range(N_SAMPLES)])

    # Convert target to Categorical
    df["delay_risk"] = pd.Categorical(
        df["delay_risk"], categories=["LOW", "MEDIUM", "HIGH"]
    )

    # --- Inject ~3 % missing values into selected numeric columns ---
    # (tests preprocessing / imputation pipeline)
    cols_with_missing = [
        "attendance",
        "study_hours",
        "previous_performance",
        "milestone_completion",
        "project_progress",
    ]
    for col in cols_with_missing:
        mask = rng.rand(N_SAMPLES) < 0.03
        df.loc[mask, col] = np.nan

    return df


def validate_dataset(df: pd.DataFrame) -> None:
    """Run sanity checks and print a summary report."""
    print("=" * 60)
    print("DATASET VALIDATION REPORT")
    print("=" * 60)

    # 1. Shape
    print(f"\nRows       : {df.shape[0]}")
    print(f"Columns    : {df.shape[1]}")
    assert df.shape[0] == N_SAMPLES, f"Expected {N_SAMPLES} rows"

    # 2. Expected columns
    expected_cols = {
        "project_id", "attendance", "study_hours", "previous_performance",
        "task_completion", "pending_tasks", "missed_deadlines",
        "milestone_completion", "days_remaining", "team_size",
        "project_type", "planned_tasks", "completed_tasks",
        "project_progress", "delay_risk",
    }
    assert expected_cols == set(df.columns), (
        f"Column mismatch.\n  Missing : {expected_cols - set(df.columns)}\n"
        f"  Extra   : {set(df.columns) - expected_cols}"
    )
    print("Columns    : OK - all expected columns present")

    # 3. Missing values
    missing = df.isnull().sum()
    print(f"\nMissing values:\n{missing[missing > 0].to_string()}")
    assert df["project_id"].isnull().sum() == 0, "project_id must have no NaN"
    assert df["delay_risk"].isnull().sum() == 0, "delay_risk must have no NaN"

    # 4. Duplicate IDs
    dup = df["project_id"].duplicated().sum()
    print(f"\nDuplicate project_ids: {dup}")
    assert dup == 0, "Duplicate project_id found"

    # 5. Range checks (on non-null values)
    pct_cols = ["attendance", "previous_performance", "task_completion",
                "milestone_completion", "project_progress"]
    for col in pct_cols:
        s = df[col].dropna()
        assert s.min() >= 0 and s.max() <= 100, f"{col} out of [0, 100]"
    assert (df["pending_tasks"] >= 0).all(), "Negative pending_tasks"
    assert (df["missed_deadlines"] >= 0).all(), "Negative missed_deadlines"
    assert (df["completed_tasks"] <= df["planned_tasks"]).all(), (
        "completed_tasks > planned_tasks"
    )
    print("Range checks: OK")

    # 6. Class distribution
    dist = df["delay_risk"].value_counts()
    print(f"\nClass distribution:\n{dist.to_string()}")
    assert set(dist.index) == {"LOW", "MEDIUM", "HIGH"}, (
        "Target must have LOW, MEDIUM, HIGH"
    )

    print("\n[OK] All validation checks passed.")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Generating synthetic dataset ...")
    df = generate_dataset()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Dataset saved to: {OUTPUT_FILE}")

    validate_dataset(df)
    print(f"\nFirst 5 rows:\n{df.head().to_string()}")
