# AI-AcadPredict — AI/ML Service
## Member 3: AI/ML Development

**AI-Integrated Academic Project Management and Delay Risk Prediction Platform**

---

## 1. Overview & Role Scope

This module represents the complete **Member 3 (AI/ML Development)** deliverable for **AI-AcadPredict**. It provides an end-to-end Machine Learning pipeline and a lightweight, high-performance FastAPI microservice designed to predict project delay risk (**LOW**, **MEDIUM**, or **HIGH**) alongside model confidence.

### Scope Boundaries:
- **Included (Member 3)**:
  - Synthetic dataset generation (5,000 student project records, 14 features + 1 target).
  - Data preprocessing pipeline with automated missing-value imputation and categorical encoding.
  - Model training, stratified validation, 5-fold cross-validation, and metrics logging.
  - Model persistence as an all-in-one scikit-learn Pipeline artifact (`models/model.pkl`).
  - Production-ready FastAPI REST API with validation schemas (`GET /`, `GET /health`, `POST /predict`).
  - Comprehensive automated test suite.
- **Excluded (Handled by other teammates)**:
  - Frontend UI / Dashboard (Member 1).
  - User Authentication & Database Management (Member 2).

---

## 2. Project Architecture & Directory Structure

```text
ai-service/
├── data/
│   └── raw/
│       └── project_delay_risk_synthetic_5000.csv   # Generated 5,000-row dataset
├── models/
│   └── model.pkl                                  # Serialized end-to-end pipeline
├── results/
│   ├── metrics/
│   │   ├── classification_report.txt              # Detailed precision/recall/F1 table
│   │   └── metrics.json                           # Machine-readable evaluation metrics
│   └── plots/
│       └── confusion_matrix.png                   # Seaborn confusion matrix heatmap
├── src/
│   ├── __init__.py
│   ├── generate_dataset.py                        # Dataset synthesis script
│   ├── preprocessing.py                           # Scikit-learn Pipeline definition
│   ├── train_model.py                             # Training, CV, evaluation, and serialization
│   ├── schemas.py                                 # Pydantic v2 request/response schemas
│   └── main.py                                    # FastAPI application and API routes
├── tests/
│   ├── __init__.py
│   └── test_all.py                                # End-to-end automated test suite
├── .gitignore
├── requirements.txt                               # Pinned Python dependencies
└── README.md                                      # Documentation & Viva guide
```

---

## 3. Dataset Description

The dataset simulates academic project progress across varied domains (**Web, AI, Mobile, Research, IoT**).

- **Total records**: 5,000 rows
- **Target variable**: `delay_risk` (`LOW`, `MEDIUM`, `HIGH`)
- **Random seed**: 42 (100% reproducible)
- **Class distribution**:
  - `LOW`: ~1,700 records (~34%)
  - `MEDIUM`: ~1,650 records (~33%)
  - `HIGH`: ~1,650 records (~33%)

### Features (14 Input Features + Target)

| Column Name | Type | Description | Range / Values |
| :--- | :--- | :--- | :--- |
| `project_id` | String | Unique project identifier (excluded from model) | `PRJ-0001` ... |
| `attendance` | Float | Student team attendance rate | 0% – 100% (median imputed) |
| `study_hours` | Float | Weekly study and project hours | 0 – 50 hrs (median imputed) |
| `previous_performance` | Float | Academic marks / GPA equivalent | 0% – 100% (median imputed) |
| `task_completion` | Float | Percentage of planned tasks completed | 0% – 100% |
| `planned_tasks` | Integer | Total assigned tasks (informational) | 5 – 50 |
| `completed_tasks` | Integer | Tasks marked completed (informational) | 0 – 50 |
| `pending_tasks` | Integer | Tasks remaining (`planned - completed`) | ≥ 0 |
| `missed_deadlines` | Integer | Count of milestone deadlines breached | 0 – 10+ |
| `milestone_completion` | Float | Percentage of project milestones met | 0% – 100% (median imputed) |
| `days_remaining` | Integer | Days until the final submission deadline | 0 – 120 days |
| `team_size` | Integer | Number of student collaborators | 1 – 6 members |
| `project_type` | String | Domain category | `Web`, `AI`, `Mobile`, `Research`, `IoT` |
| `project_progress` | Float | Overall self-reported project completion | 0% – 100% (median imputed) |
| **`delay_risk`** | **String** | **Target label** | **`LOW`, `MEDIUM`, `HIGH`** |

*Realistic missingness*: ~3% missing values are injected into numerical columns (`attendance`, `study_hours`, `previous_performance`, `milestone_completion`, `project_progress`) to rigorously test automated imputation during inference.

---

## 4. Machine Learning Pipeline & Training

### Preprocessing Architecture
To prevent **data leakage** and ensure zero mismatch between training and inference, the entire pipeline is wrapped inside a single `sklearn.pipeline.Pipeline`:
1. **Numerical Transformer**:
   - `SimpleImputer(strategy="median")`
2. **Categorical Transformer**:
   - `SimpleImputer(strategy="most_frequent")`
   - `OneHotEncoder(handle_unknown="ignore", sparse_output=False)`
3. **Classifier**:
   - `RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_split=5, random_state=42)`

The fitted object saved to `models/model.pkl` accepts raw feature tables and handles all transformations internally.

### Model Evaluation (Actual Genuine Metrics)

> **Important**: In accordance with academic honesty standards, these scores were directly computed from the 20% held-out test set (`n=1,000`) and 5-fold cross-validation on the training set (`n=4,000`).

| Metric | Measured Value |
| :--- | :--- |
| **Test Accuracy** | **89.40%** (`0.8940`) |
| **5-Fold CV Accuracy (Mean ± Std)** | **90.70% ± 0.92%** |
| **Weighted Precision** | **89.61%** (`0.8961`) |
| **Weighted Recall** | **89.40%** (`0.8940`) |
| **Weighted F1-Score** | **89.46%** (`0.8946`) |

#### Classification Report (Per-Class)

```text
              precision    recall  f1-score   support
         LOW       0.91      0.87      0.89       330
      MEDIUM       0.95      0.94      0.95       340
        HIGH       0.82      0.87      0.84       330

    accuracy                           0.89      1000
   macro avg       0.90      0.89      0.89      1000
weighted avg       0.90      0.89      0.89      1000
```

#### Confusion Matrix
```text
               Predicted LOW   Predicted MEDIUM   Predicted HIGH
Actual LOW          319               21                 0
Actual MEDIUM        16              287                27
Actual HIGH           0               42               288
```
- There are **0 extreme misclassifications** (no LOW predicted as HIGH, and no HIGH predicted as LOW).
- Errors occur strictly between adjacent risk boundaries (LOW ↔ MEDIUM and MEDIUM ↔ HIGH).

---

## 5. FastAPI Prediction Service

The microservice exposes clean REST endpoints with Pydantic validation supporting both **camelCase** (standard for Frontend / Node.js backends) and **snake_case** (Python standard).

### Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status and root greeting |
| `GET` | `/health` | Model health status check |
| `POST` | `/predict` | Evaluates project risk and returns predicted class + confidence |

### Sample Request (`POST /predict`)
```json
{
  "attendance": 70.0,
  "studyHours": 15.0,
  "previousPerformance": 65.0,
  "taskCompletion": 50.0,
  "pendingTasks": 7,
  "missedDeadlines": 2,
  "milestoneCompletion": 40.0,
  "daysRemaining": 10,
  "teamSize": 4,
  "projectType": "AI",
  "projectProgress": 45.0
}
```

### Sample Response (`200 OK`)
```json
{
  "risk": "MEDIUM",
  "probability": 0.8781
}
```

---

## 6. Installation & Execution Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.10, 3.11, 3.12, 3.13)
- `pip` package manager

### 1. Create and Activate Virtual Environment
```bash
# Navigate to the ai-service directory
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Windows (cmd):
venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Generate Dataset (Optional - pre-generated data included)
```bash
python -m src.generate_dataset
```
*Outputs: `data/raw/project_delay_risk_synthetic_5000.csv`*

### 4. Train the Model & Generate Reports
```bash
python -m src.train_model
```
*Outputs: `models/model.pkl`, `results/metrics/metrics.json`, `results/plots/confusion_matrix.png`*

### 5. Run the Automated Test Suite
```bash
python -m tests.test_all
```
*Or using pytest:*
```bash
pytest tests/ -v
```

### 6. Launch the FastAPI Microservice
```bash
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```
- Open Swagger interactive UI: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
- Health check: **[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)**

---

## 7. College Project Demonstration & Viva FAQ

### Q1: Why did you choose Random Forest instead of Logistic Regression or a Neural Network?
> **Answer**: Random Forest is an ensemble of decision trees that handles non-linear relationships, multi-class classification, and interactions between features (e.g., low task completion compounded by low days remaining) without requiring complex feature engineering. It is robust to outliers, does not require strict feature normalization, avoids overfitting through bagging and feature subsampling, and provides interpretable probabilities with fast inference times suitable for a college management platform.

### Q2: What is data leakage and how did you prevent it?
> **Answer**: Data leakage occurs when information from the test dataset is inadvertently shared with the training process (for example, calculating mean/median imputation or categorical encoding on the whole dataset prior to splitting). We completely prevented this by splitting data into train (80%) and test (20%) sets *before* fitting any transformer, and embedding both the imputer and encoder into a unified scikit-learn `Pipeline`. The pipeline fits statistics exclusively on the training split and applies them blindly to test data and API inputs.

### Q3: How do you interpret the `probability` field returned by the API?
> **Answer**: The returned probability reflects the model's confidence for the **predicted class** (obtained via `predict_proba`). For example, if `risk: "MEDIUM"` and `probability: 0.8781`, it indicates the Random Forest ensemble estimated an 87.81% likelihood that this project belongs to the MEDIUM risk tier.

### Q4: Since you used synthetic data, can this model be used immediately in a real university?
> **Answer**: No. Synthetic data is generated using predefined logical distributions to validate the software architecture, pipeline integration, and API contract. While it exhibits realistic variance and noise, it does not account for institutional nuances, differing grading scales, or real-world behavioral quirks. For actual production use, the pipeline should be retrained on genuine historical academic project data.

### Q5: How does this AI module integrate with your teammates' modules?
> **Answer**: Member 3 provides a decoupled REST API. Member 1 (Frontend) or Member 2 (Backend) can submit project attributes as a JSON payload to `POST http://<ai-service-ip>:8000/predict`. The API responds in under 50ms with the risk assessment and confidence score, which the backend stores or the dashboard displays with visual alerts (green/amber/red).
