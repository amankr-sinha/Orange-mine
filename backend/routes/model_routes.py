from __future__ import annotations

from typing import Any, Dict

from flask import Blueprint, jsonify, request

from services.model_service import ModelService
from services.storage import STORE


bp = Blueprint("model", __name__, url_prefix="/api/model")


@bp.post("/train")
def train() -> Any:
    body: Dict[str, Any] = request.get_json(silent=True) or {}

    train_id = body.get("train_dataset_id")
    test_id = body.get("test_dataset_id")
    model_type = body.get("model_type")
    target_column = body.get("target_column")
    feature_columns = body.get("feature_columns") or []
    hyperparameters = body.get("hyperparameters") or {}

    if not train_id or not STORE.has_dataset(train_id):
        return jsonify({"error": "Invalid train_dataset_id"}), 400
    if not test_id or not STORE.has_dataset(test_id):
        return jsonify({"error": "Invalid test_dataset_id"}), 400
    if not model_type:
        return jsonify({"error": "Missing model_type"}), 400
    if not target_column:
        return jsonify({"error": "Missing target_column"}), 400

    try:
        result = ModelService.train(
            STORE.get_dataset(train_id),
            STORE.get_dataset(test_id),
            model_type=model_type,
            target_column=target_column,
            feature_columns=list(feature_columns),
            hyperparameters=hyperparameters,
        )
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 400

    return jsonify(result)


@bp.get("/<model_id>/results")
def results(model_id: str) -> Any:
    if not STORE.has_model(model_id):
        return jsonify({"error": "Model not found"}), 404
    # For now, training already returns full results.
    # This endpoint is kept for API completeness.
    return jsonify({"model_id": model_id, "status": "ok"})
