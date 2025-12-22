from __future__ import annotations

import uuid
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd

from .storage import STORE


class DataService:
    @staticmethod
    def _new_id(prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex}" 

    @staticmethod
    def load_dataframe_from_file(path: str) -> pd.DataFrame:
        lower = path.lower()
        if lower.endswith(".csv"):
            return pd.read_csv(path)
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            return pd.read_excel(path)
        raise ValueError("Unsupported file type")

    @staticmethod
    def store_dataset(df: pd.DataFrame) -> str:
        dataset_id = DataService._new_id("ds")
        STORE.put_dataset(dataset_id, df)
        return dataset_id

    @staticmethod
    def get_dataset_info(dataset_id: str, preview_rows: int = 10) -> Dict[str, Any]:
        df = STORE.get_dataset(dataset_id)
        preview_df = df.head(preview_rows)

        dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
        preview = preview_df.replace({np.nan: None}).to_dict(orient="records")
        columns = list(preview_df.columns)

        return {
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "column_names": list(df.columns),
            "dtypes": dtypes,
            "preview": preview,
            "preview_columns": columns,
        }

    @staticmethod
    def get_preview(dataset_id: str, n_rows: int = 10) -> Tuple[List[Dict[str, Any]], List[str]]:
        df = STORE.get_dataset(dataset_id)
        preview_df = df.head(n_rows)
        data = preview_df.replace({np.nan: None}).to_dict(orient="records")
        columns = list(preview_df.columns)
        return data, columns
