from __future__ import annotations

from flask import Flask, send_from_directory
from flask_cors import CORS

from routes.data_routes import bp as data_bp
from routes.preprocessing_routes import bp as preprocessing_bp
from routes.model_routes import bp as model_bp
from routes.pipeline_routes import bp as pipeline_bp


def create_app() -> Flask:
    # When deployed via Docker, the built frontend is copied into backend/static.
    # We serve it directly from Flask so a single container can host both UI + API.
    app = Flask(__name__, static_folder="static", static_url_path="/")
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(data_bp)
    app.register_blueprint(preprocessing_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(pipeline_bp)

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/<path:path>")
    def spa_fallback(path: str):
        # Serve static assets if they exist; otherwise fall back to index.html for SPA routes.
        try:
            return send_from_directory(app.static_folder, path)
        except Exception:
            return send_from_directory(app.static_folder, "index.html")


    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
