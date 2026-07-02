from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
import math
import hashlib
import time
import numpy as np

router = APIRouter(prefix="/student", tags=["student"])

# Default Enterprise demo dataset: Customer Churn Behavior Logs
DEFAULT_DEMO_DATASET = {
    "headers": ["CustomerID", "Tenure_Months", "Usage_Frequency", "Support_Tickets", "Monthly_Charge", "Churn_Risk"],
    "columns": [
        {"name": "CustomerID", "type": "categorical", "unique": 500, "nulls": 0},
        {"name": "Tenure_Months", "type": "numerical", "min": 1, "max": 72, "mean": 24.5},
        {"name": "Usage_Frequency", "type": "numerical", "min": 2, "max": 180, "mean": 45.2},
        {"name": "Support_Tickets", "type": "numerical", "min": 0, "max": 12, "mean": 2.1},
        {"name": "Monthly_Charge", "type": "numerical", "min": 15.0, "max": 199.9, "mean": 74.85},
        {"name": "Churn_Risk", "type": "categorical", "unique": 2, "nulls": 0}
    ],
    "rows": [
        {"CustomerID": "CUST-101", "Tenure_Months": 18, "Usage_Frequency": 45, "Support_Tickets": 1, "Monthly_Charge": 64.50, "Churn_Risk": "Low"},
        {"CustomerID": "CUST-102", "Tenure_Months": 3, "Usage_Frequency": 8, "Support_Tickets": 6, "Monthly_Charge": 89.90, "Churn_Risk": "High"},
        {"CustomerID": "CUST-103", "Tenure_Months": 24, "Usage_Frequency": 82, "Support_Tickets": 2, "Monthly_Charge": 99.50, "Churn_Risk": "Medium"},
        {"CustomerID": "CUST-104", "Tenure_Months": 48, "Usage_Frequency": 110, "Support_Tickets": 0, "Monthly_Charge": 45.00, "Churn_Risk": "Low"},
        {"CustomerID": "CUST-105", "Tenure_Months": 12, "Usage_Frequency": 32, "Support_Tickets": 4, "Monthly_Charge": 79.00, "Churn_Risk": "High"},
        {"CustomerID": "CUST-106", "Tenure_Months": 36, "Usage_Frequency": 95, "Support_Tickets": 1, "Monthly_Charge": 115.00, "Churn_Risk": "Low"},
        {"CustomerID": "CUST-107", "Tenure_Months": 6, "Usage_Frequency": 18, "Support_Tickets": 5, "Monthly_Charge": 55.00, "Churn_Risk": "High"},
        {"CustomerID": "CUST-108", "Tenure_Months": 60, "Usage_Frequency": 140, "Support_Tickets": 0, "Monthly_Charge": 85.00, "Churn_Risk": "Low"},
        {"CustomerID": "CUST-109", "Tenure_Months": 2, "Usage_Frequency": 15, "Support_Tickets": 3, "Monthly_Charge": 39.90, "Churn_Risk": "Medium"},
        {"CustomerID": "CUST-110", "Tenure_Months": 72, "Usage_Frequency": 175, "Support_Tickets": 1, "Monthly_Charge": 120.00, "Churn_Risk": "Low"}
    ]
}

class ColumnMeta(BaseModel):
    name: str
    type: str
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    unique: Optional[int] = None
    nulls: int

class DatasetStatsResponse(BaseModel):
    headers: List[str]
    columns: List[ColumnMeta]
    rows_count: int
    rows: List[Dict[str, Any]]

class ModelTrainInput(BaseModel):
    model_type: str  # "LSTM", "Transformer", "XGBoost", "Random Forest", "Neural Network"
    epochs: int
    learning_rate: float
    batch_size: int
    optimizer: str  # "Adam", "SGD", "RMSprop"
    target_column: str
    features: List[str]

class PredictInput(BaseModel):
    model_type: str
    features: Dict[str, Any]

@router.get("/preset", response_model=DatasetStatsResponse)
def get_preset_dataset():
    """
    Returns the default professional demo dataset.
    """
    return {
        "headers": DEFAULT_DEMO_DATASET["headers"],
        "columns": DEFAULT_DEMO_DATASET["columns"],
        "rows_count": len(DEFAULT_DEMO_DATASET["rows"]),
        "rows": DEFAULT_DEMO_DATASET["rows"]
    }

@router.post("/upload", response_model=DatasetStatsResponse)
def upload_dataset(payload: List[Dict[str, Any]]):
    """
    Parses and calculates descriptive statistics for any uploaded CSV/JSON dataset.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Empty dataset payload")
        
    headers = list(payload[0].keys())
    columns_meta = []
    
    for h in headers:
        vals = [row[h] for row in payload if row.get(h) is not None]
        null_count = sum(1 for row in payload if row.get(h) is None)
        
        # Check if values are numeric
        is_numeric = False
        try:
            float_vals = [float(v) for v in vals]
            is_numeric = True
        except ValueError:
            pass
            
        if is_numeric and len(float_vals) > 0:
            columns_meta.append({
                "name": h,
                "type": "numerical",
                "min": float(np.min(float_vals)),
                "max": float(np.max(float_vals)),
                "mean": float(round(np.mean(float_vals), 2)),
                "unique": len(set(float_vals)),
                "nulls": null_count
            })
        else:
            columns_meta.append({
                "name": h,
                "type": "categorical",
                "unique": len(set(vals)),
                "nulls": null_count
            })
            
    return {
        "headers": headers,
        "columns": columns_meta,
        "rows_count": len(payload),
        "rows": payload[:10]  # Return first 10 rows for preview
    }

@router.post("/train")
def train_model(payload: ModelTrainInput):
    """
    Executes mock model training with advanced validation parameters.
    """
    model = payload.model_type
    epochs = payload.epochs
    lr = payload.learning_rate
    optimizer = payload.optimizer
    
    time.sleep(0.8)  # Mock training delay
    
    # Base indicators representing realistic training characteristics
    base_accuracy = 0.75
    base_precision = 0.73
    base_recall = 0.72
    
    # Parameters adjustments
    lr_modifier = 0.03 if (0.0001 <= lr <= 0.01) else -0.06
    epoch_modifier = 0.05 if epochs >= 15 else -0.04
    opt_modifier = 0.02 if optimizer == "Adam" else -0.02
    
    if model == "LSTM":
        base_accuracy = 0.82
        base_precision = 0.80
        base_recall = 0.81
    elif model == "Transformer":
        base_accuracy = 0.86
        base_precision = 0.85
        base_recall = 0.84
    elif model == "XGBoost":
        base_accuracy = 0.84
        base_precision = 0.85
        base_recall = 0.81
    elif model == "Random Forest":
        base_accuracy = 0.80
        base_precision = 0.81
        base_recall = 0.78
    else:  # Neural Network
        base_accuracy = 0.79
        base_precision = 0.78
        base_recall = 0.77
        
    acc = min(0.98, max(0.45, base_accuracy + lr_modifier + epoch_modifier + opt_modifier))
    prec = min(0.98, max(0.45, base_precision + lr_modifier + epoch_modifier + opt_modifier))
    rec = min(0.98, max(0.45, base_recall + lr_modifier + epoch_modifier + opt_modifier))
    f1 = 2 * (acc * rec) / (acc + rec)
    
    # Loss timeline simulation
    loss_history = []
    curr_loss = 0.65
    for e in range(1, epochs + 1):
        decay = 0.85 if optimizer == "Adam" else 0.90
        curr_loss = curr_loss * (decay - (lr * 0.1)) + random.uniform(0.005, 0.02)
        loss_history.append({"epoch": e, "loss": round(curr_loss, 4)})
        
    # Feature Importance simulation
    features = payload.features if payload.features else ["Feature_A", "Feature_B", "Feature_C"]
    feature_importance = []
    total_imp = 0.0
    for idx, feat in enumerate(features):
        weight = int(hashlib.md5(feat.encode()).hexdigest(), 16) % 100
        feature_importance.append({"feature": feat, "importance": weight})
        total_imp += weight
        
    for item in feature_importance:
        item["importance"] = round((item["importance"] / total_imp) * 100, 2)
        
    # Sort feature importance
    feature_importance = sorted(feature_importance, key=lambda x: x["importance"], reverse=True)
    
    return {
        "model": model,
        "optimizer": optimizer,
        "metrics": {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "training_time_seconds": round(0.12 * epochs + random.uniform(0.1, 0.3), 3)
        },
        "loss_history": loss_history,
        "feature_importance": feature_importance
    }

@router.post("/predict")
def predict_inference(payload: PredictInput):
    """
    Run prediction inference using trained model features input.
    """
    features = payload.features
    model = payload.model_type
    
    if not features:
        raise HTTPException(status_code=400, detail="Features input mapping cannot be empty")
        
    # Simple hash of inputs to simulate deterministic outputs
    seed_str = "".join(f"{k}:{v}" for k, v in sorted(features.items()))
    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    
    # Generate generic classifications based on hash
    outcomes = ["Target_Class_0", "Target_Class_1", "Target_Class_2"]
    prob_0 = round(0.55 + (hash_val % 25) / 100, 2)
    prob_1 = round((1.0 - prob_0) * 0.7, 2)
    prob_2 = round(1.0 - prob_0 - prob_1, 2)
    
    predictions = [
        {"class": outcomes[0], "probability": prob_0},
        {"class": outcomes[1], "probability": prob_1},
        {"class": outcomes[2], "probability": prob_2}
    ]
    
    return {
        "model": model,
        "features_input": features,
        "predictions": predictions
    }
