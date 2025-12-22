from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from .storage import STORE


class PreprocessingService:
    @staticmethod
    def _new_id(prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex}" 

    @staticmethod
    def _numeric_columns(df: pd.DataFrame) -> List[str]:
        return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]

    @staticmethod
    def get_stats(dataset_id: str, columns: Optional[List[str]] = None) -> Dict[str, Any]:
        df = STORE.get_dataset(dataset_id)
        cols = columns or PreprocessingService._numeric_columns(df)
        numeric = df[cols].select_dtypes(include=["number"])
        desc = numeric.describe().replace({np.nan: None}).to_dict()
        return {"columns": cols, "describe": desc}

    @staticmethod
    def apply(dataset_id: str, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        df = STORE.get_dataset(dataset_id).copy()
        before = PreprocessingService.get_stats(dataset_id)

        for op in operations:
            op_type = op.get("type")
            cols = op.get("columns") or []
            cols = [c for c in cols if c in df.columns]
            if not cols:
                continue

            numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
            if not numeric_cols:
                continue

            if op_type == "standardization":
                scaler = StandardScaler()
                df[numeric_cols] = scaler.fit_transform(df[numeric_cols])
            elif op_type == "normalization":
                scaler = MinMaxScaler()
                df[numeric_cols] = scaler.fit_transform(df[numeric_cols])

        processed_id = PreprocessingService._new_id("ds")
        STORE.put_dataset(processed_id, df)
        after = PreprocessingService.get_stats(processed_id)

        return {
            "processed_dataset_id": processed_id,
            "statistics": {"before": before, "after": after},
        }
