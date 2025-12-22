from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import pandas as pd


@dataclass
class ExecutionState:
    execution_id: str
    status: str = "queued"  # queued|running|success|error|cancelled
    message: str = ""
    results_per_node: Dict[str, Any] = field(default_factory=dict)
    node_status: Dict[str, str] = field(default_factory=dict)  # node_id -> status
    cancel_requested: bool = False


class InMemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._datasets: Dict[str, pd.DataFrame] = {}
        self._models: Dict[str, Any] = {}
        self._executions: Dict[str, ExecutionState] = {}

    def put_dataset(self, dataset_id: str, df: pd.DataFrame) -> None:
        with self._lock:
            self._datasets[dataset_id] = df

    def get_dataset(self, dataset_id: str) -> pd.DataFrame:
        with self._lock:
            return self._datasets[dataset_id]

    def has_dataset(self, dataset_id: str) -> bool:
        with self._lock:
            return dataset_id in self._datasets

    def put_model(self, model_id: str, model: Any) -> None:
        with self._lock:
            self._models[model_id] = model

    def has_model(self, model_id: str) -> bool:
        with self._lock:
            return model_id in self._models

    def get_model(self, model_id: str) -> Any:
        with self._lock:
            return self._models[model_id]

    def put_execution(self, state: ExecutionState) -> None:
        with self._lock:
            self._executions[state.execution_id] = state

    def get_execution(self, execution_id: str) -> ExecutionState:
        with self._lock:
            return self._executions[execution_id]

    def has_execution(self, execution_id: str) -> bool:
        with self._lock:
            return execution_id in self._executions


STORE = InMemoryStore()
