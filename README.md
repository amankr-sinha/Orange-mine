# No-code ML Pipeline Builder (Orange Mine)

Build and run end-to-end ML pipelines using a visual, node-based canvas.

## Deployed Link: https://orange-mine-production.up.railway.app/

## What you can do

- **Drag & drop pipeline building** on a React Flow canvas
- **Strict connection validation** (Data → Preprocessing → Train/Test Split → Model → Results)
- **Node configuration panel** for editing each step’s settings
- **Data upload** (CSV/XLSX) with dataset preview + column/dtype info
- **Preprocessing** (Standardization / Normalization) with selectable columns + preview statistics
- **Train/Test split** with slider + common presets (e.g., 80/20, 70/30)
- **Model training** (Logistic Regression / Decision Tree) with basic hyperparameters
- **Results view** with metrics, classification report, confusion matrix, and feature-importance visualization (when available)

## UX features

- **Right-click context menu** on canvas nodes (Delete / Disconnect)
- **Keyboard delete** (Backspace/Delete)
- **Hover tooltips** on sidebar node palette and on node icons in the canvas
- **Mini-map** for navigating larger graphs
- **Toast notifications** for execution and save/upload feedback

## Repo layout

- `frontend/`: Vite + React + TypeScript + shadcn/ui + React Flow pipeline builder
- `backend/`: Flask API for data upload, preprocessing, splitting, model training, and pipeline execution

## Run (Frontend)

```bash
cd frontend
npm install
npm run dev
```

## Run (Backend)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Frontend expects the backend at `http://localhost:5000` by default.
You can override with `VITE_API_BASE_URL` in `frontend/.env`.

## Docker (single container)

This repo includes a production Docker build that bundles the frontend and serves it from the Flask backend.

```bash
docker build -t orange-mine .
docker run --rm -p 5000:5000 orange-mine
```

Open `http://localhost:5000`.

