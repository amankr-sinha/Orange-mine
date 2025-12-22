from __future__ import annotations

from typing import Any, Dict

from flask import Blueprint, jsonify, request

from services.preprocessing_service import PreprocessingService
from services.storage import STORE


bp = Blueprint("preprocessing", __name__, url_prefix="/api/preprocessing")


@bp.post("/apply")
def apply() -> Any:
    body: Dict[str, Any] = request.get_json(silent=True) or {}
    dataset_id = body.get("dataset_id")
    operations = body.get("operations", [])

    if not dataset_id or not STORE.has_dataset(dataset_id):
        return jsonify({"error": "Invalid dataset_id"}), 400

    try:
        result = PreprocessingService.apply(dataset_id, operations)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(result)


@bp.get("/<dataset_id>/stats")
def stats(dataset_id: str) -> Any:
    if not STORE.has_dataset(dataset_id):
        return jsonify({"error": "Dataset not found"}), 404

    columns = request.args.getlist("columns")
    try:
        result = PreprocessingService.get_stats(dataset_id, columns=columns or None)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(result)
