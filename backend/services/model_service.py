from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.tree import DecisionTreeClassifier

from .storage import STORE


class ModelService:
    @staticmethod
    def _new_id(prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex}" 

    @staticmethod
    def _prepare_xy(
        df: pd.DataFrame,
        target_column: str,
        feature_columns: List[str],
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found")

        features = [c for c in feature_columns if c in df.columns and c != target_column]
        if not features:
            raise ValueError("No valid feature columns selected")

        X = df[features]
        y = df[target_column]

        # Basic handling: drop rows with missing values in selected columns
        combined = pd.concat([X, y], axis=1).dropna()
        X = combined[features]
        y = combined[target_column]

        # Encode non-numeric features via one-hot
        X = pd.get_dummies(X, drop_first=False)
        return X.to_numpy(), y.to_numpy(), list(X.columns)

    @staticmethod
    def train(
        train_df: pd.DataFrame,
        test_df: pd.DataFrame,
        model_type: str,
        target_column: str,
        feature_columns: List[str],
        hyperparameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        hyperparameters = hyperparameters or {}

        X_train, y_train, feature_names = ModelService._prepare_xy(
            train_df, target_column, feature_columns
        )
        X_test, y_test, _ = ModelService._prepare_xy(test_df, target_column, feature_columns)

        if model_type == "logistic_regression":
            max_iter = int(hyperparameters.get("max_iter", 200))
            C = float(hyperparameters.get("C", 1.0))
            model = LogisticRegression(max_iter=max_iter, C=C)
        elif model_type == "decision_tree":
            max_depth = hyperparameters.get("max_depth", None)
            min_samples_split = int(hyperparameters.get("min_samples_split", 2))
            model = DecisionTreeClassifier(
                max_depth=None if max_depth in (None, "", 0) else int(max_depth),
                min_samples_split=min_samples_split,
                random_state=int(hyperparameters.get("random_state", 42)),
            )
        else:
            raise ValueError("Unsupported model_type")

        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        accuracy = float(accuracy_score(y_test, y_pred))
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )
        cm = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        model_id = ModelService._new_id("model")
        STORE.put_model(model_id, {"model": model, "feature_names": feature_names, "type": model_type})

        payload: Dict[str, Any] = {
            "model_id": model_id,
            "status": "success",
            "metrics": {
                "accuracy": accuracy,
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
            },
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
        }

        if model_type == "decision_tree":
            importances = getattr(model, "feature_importances_", None)
            if importances is not None:
                payload["feature_importance"] = {
                    "features": feature_names,
                    "importances": [float(x) for x in importances],
                }

        return payload
