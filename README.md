# No-code ML Pipeline Builder (Orange-style)

This repo is split into:

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
# Orange-mine
