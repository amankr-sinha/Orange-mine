from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS

from routes.data_routes import bp as data_bp
from routes.preprocessing_routes import bp as preprocessing_bp
from routes.model_routes import bp as model_bp
from routes.pipeline_routes import bp as pipeline_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(data_bp)
    app.register_blueprint(preprocessing_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(pipeline_bp)


    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
