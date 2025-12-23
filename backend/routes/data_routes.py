from __future__ import annotations

import os
import tempfile
from typing import Any, Dict

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from services.data_service import DataService
from services.storage import STORE
from utils.validators import ValidationError, validate_file_extension


bp = Blueprint("data", __name__, url_prefix="/api/data")


def _backend_data_dir() -> str:
    # backend/routes -> backend
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def _sample_label_from_filename(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    # iris_dataset -> Iris dataset
    return base.replace("_", " ").strip().capitalize()


@bp.post("/upload")
def upload() -> Any:
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400

    file = request.files["file"]
    if file.filename is None or file.filename.strip() == "":
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)

    try:
        validate_file_extension(filename)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400

    suffix = os.path.splitext(filename)[1].lower()
    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, f"upload_{os.urandom(8).hex()}{suffix}")
    file.save(tmp_path)

    try:
        df = DataService.load_dataframe_from_file(tmp_path)
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {e}"}), 400
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    dataset_id = DataService.store_dataset(df)
    info = DataService.get_dataset_info(dataset_id)

    return jsonify({"dataset_id": dataset_id, "info": info})


@bp.get("/samples")
def list_samples() -> Any:
    data_dir = _backend_data_dir()
    if not os.path.isdir(data_dir):
        return jsonify({"samples": []})

    samples = []
    for name in sorted(os.listdir(data_dir)):
        path = os.path.join(data_dir, name)
        if not os.path.isfile(path):
            continue
        lower = name.lower()
        if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
            continue
        samples.append({"filename": name, "label": _sample_label_from_filename(name)})

    return jsonify({"samples": samples})


@bp.post("/samples/load")
def load_sample() -> Any:
    body: Dict[str, Any] = request.get_json(silent=True) or {}
    filename = body.get("filename")
    if not filename or not isinstance(filename, str):
        return jsonify({"error": "Missing filename"}), 400

    # Prevent path traversal; only allow basenames that exist in backend/data.
    filename = os.path.basename(filename)

    try:
        validate_file_extension(filename)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400

    data_dir = _backend_data_dir()
    path = os.path.abspath(os.path.join(data_dir, filename))

    # Ensure the resolved path is still inside backend/data.
    if os.path.commonpath([data_dir, path]) != data_dir:
        return jsonify({"error": "Invalid filename"}), 400

    if not os.path.isfile(path):
        return jsonify({"error": "Sample not found"}), 404

    try:
        df = DataService.load_dataframe_from_file(path)
    except Exception as e:
        return jsonify({"error": f"Failed to parse sample: {e}"}), 400

    dataset_id = DataService.store_dataset(df)
    info = DataService.get_dataset_info(dataset_id)
    return jsonify({"dataset_id": dataset_id, "info": info, "fileName": filename})


@bp.get("/<dataset_id>/preview")
def preview(dataset_id: str) -> Any:
    if not STORE.has_dataset(dataset_id):
        return jsonify({"error": "Dataset not found"}), 404

    n = request.args.get("n", default=10, type=int)
    data, columns = DataService.get_preview(dataset_id, n_rows=max(1, min(n, 200)))
    return jsonify({"data": data, "columns": columns})


@bp.post("/split")
def split() -> Any:
    body: Dict[str, Any] = request.get_json(silent=True) or {}
    dataset_id = body.get("dataset_id")
    test_size = float(body.get("test_size", 0.2))
    random_state = body.get("random_state", None)

    if not dataset_id or not STORE.has_dataset(dataset_id):
        return jsonify({"error": "Invalid dataset_id"}), 400

    if not (0.05 <= test_size <= 0.95):
        return jsonify({"error": "test_size must be between 0.05 and 0.95"}), 400

    from sklearn.model_selection import train_test_split

    df = STORE.get_dataset(dataset_id)
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=None if random_state in (None, "", "null") else int(random_state),
        shuffle=True,
    )

    train_id = DataService.store_dataset(train_df.reset_index(drop=True))
    test_id = DataService.store_dataset(test_df.reset_index(drop=True))

    return jsonify(
        {
            "train_dataset_id": train_id,
            "test_dataset_id": test_id,
            "train_size": int(train_df.shape[0]),
            "test_size": int(test_df.shape[0]),
        }
    )
