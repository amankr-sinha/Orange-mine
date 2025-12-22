from __future__ import annotations

import threading
import uuid
from typing import Any, Dict, List, Tuple

from flask import Blueprint, jsonify, request

from services.data_service import DataService
from services.model_service import ModelService
from services.preprocessing_service import PreprocessingService
from services.storage import ExecutionState, STORE


bp = Blueprint("pipeline", __name__, url_prefix="/api/pipeline")


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}" 


def _toposort(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[str]:
    node_ids = {n["id"] for n in nodes}
    incoming = {nid: 0 for nid in node_ids}
    outgoing: Dict[str, List[str]] = {nid: [] for nid in node_ids}

    for e in edges:
        src = e.get("source")
        tgt = e.get("target")
        if src in node_ids and tgt in node_ids:
            outgoing[src].append(tgt)
            incoming[tgt] += 1

    queue = [nid for nid, deg in incoming.items() if deg == 0]
    ordered: List[str] = []

    while queue:
        nid = queue.pop(0)
        ordered.append(nid)
        for nxt in outgoing.get(nid, []):
            incoming[nxt] -= 1
            if incoming[nxt] == 0:
                queue.append(nxt)

    if len(ordered) != len(node_ids):
        raise ValueError("Pipeline has cycles or disconnected nodes")

    return ordered


@bp.post("/execute")
def execute() -> Any:
    body: Dict[str, Any] = request.get_json(silent=True) or {}
    nodes: List[Dict[str, Any]] = body.get("nodes", [])
    edges: List[Dict[str, Any]] = body.get("connections", [])

    execution_id = _new_id("exec")
    state = ExecutionState(execution_id=execution_id, status="queued")

    # initialize node status
    for n in nodes:
        nid = n.get("id")
        if nid:
            state.node_status[nid] = "queued"

    STORE.put_execution(state)

    def run() -> None:
        st = STORE.get_execution(execution_id)
        st.status = "running"

        try:
            ordered = _toposort(nodes, edges)
            node_map = {n["id"]: n for n in nodes}

            context: Dict[str, Any] = {}

            for nid in ordered:
                if st.cancel_requested:
                    st.status = "cancelled"
                    st.node_status[nid] = "cancelled"
                    return

                node = node_map[nid]
                ntype = node.get("type")
                config = node.get("config", {})

                st.node_status[nid] = "running"

                if ntype == "dataUpload":
                    dataset_id = config.get("dataset_id")
                    if not dataset_id or not STORE.has_dataset(dataset_id):
                        raise ValueError("Data Upload node is missing a valid dataset_id. Upload a file first.")
                    context["dataset_id"] = dataset_id
                    st.results_per_node[nid] = {"dataset_id": dataset_id, "info": DataService.get_dataset_info(dataset_id)}

                elif ntype == "preprocessing":
                    dataset_id = context.get("dataset_id")
                    if not dataset_id:
                        raise ValueError("Preprocessing node has no input dataset")

                    operations = config.get("operations", [])
                    result = PreprocessingService.apply(dataset_id, operations)
                    context["dataset_id"] = result["processed_dataset_id"]
                    st.results_per_node[nid] = result

                elif ntype == "trainTestSplit":
                    dataset_id = context.get("dataset_id")
                    if not dataset_id:
                        raise ValueError("Split node has no input dataset")

                    test_size = float(config.get("test_size", 0.2))
                    random_state = config.get("random_state", 42)

                    from sklearn.model_selection import train_test_split

                    df = STORE.get_dataset(dataset_id)
                    train_df, test_df = train_test_split(
                        df,
                        test_size=test_size,
                        random_state=int(random_state) if random_state not in (None, "", "null") else None,
                        shuffle=True,
                    )
                    train_id = DataService.store_dataset(train_df.reset_index(drop=True))
                    test_id = DataService.store_dataset(test_df.reset_index(drop=True))
                    context["train_dataset_id"] = train_id
                    context["test_dataset_id"] = test_id
                    st.results_per_node[nid] = {
                        "train_dataset_id": train_id,
                        "test_dataset_id": test_id,
                        "train_size": int(train_df.shape[0]),
                        "test_size": int(test_df.shape[0]),
                    }

                elif ntype == "model":
                    train_id = context.get("train_dataset_id")
                    test_id = context.get("test_dataset_id")
                    if not train_id or not test_id:
                        raise ValueError("Model node missing train/test inputs")

                    model_type = config.get("model_type", "logistic_regression")
                    target_column = config.get("target_column")
                    feature_columns = config.get("feature_columns") or []
                    hyperparameters = config.get("hyperparameters") or {}

                    result = ModelService.train(
                        STORE.get_dataset(train_id),
                        STORE.get_dataset(test_id),
                        model_type=model_type,
                        target_column=target_column,
                        feature_columns=feature_columns,
                        hyperparameters=hyperparameters,
                    )
                    context["model_result"] = result
                    st.results_per_node[nid] = result

                elif ntype == "results":
                    model_result = context.get("model_result")
                    if not model_result:
                        raise ValueError("Results node has no model result")
                    st.results_per_node[nid] = model_result

                else:
                    raise ValueError(f"Unknown node type: {ntype}")

                st.node_status[nid] = "success"

            st.status = "success"

        except Exception as e:
            st.status = "error"
            st.message = str(e)

    threading.Thread(target=run, daemon=True).start()

    return jsonify({"execution_id": execution_id, "status": state.status})


@bp.get("/<execution_id>/status")
def status(execution_id: str) -> Any:
    if not STORE.has_execution(execution_id):
        return jsonify({"error": "Execution not found"}), 404

    st = STORE.get_execution(execution_id)
    return jsonify(
        {
            "execution_id": st.execution_id,
            "status": st.status,
            "message": st.message,
            "node_status": st.node_status,
            "results_per_node": st.results_per_node,
        }
    )


@bp.post("/<execution_id>/cancel")
def cancel(execution_id: str) -> Any:
    if not STORE.has_execution(execution_id):
        return jsonify({"error": "Execution not found"}), 404

    st = STORE.get_execution(execution_id)
    st.cancel_requested = True
    return jsonify({"execution_id": st.execution_id, "status": "cancelling"})
