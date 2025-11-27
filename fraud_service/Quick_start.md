# Quick start (MLflow + retrain + FastAPI)

Minimal steps to run the service with the helper scripts.

## Prerequisites
- Python 3.9+ and `pip install -r requirements.txt`
- MLflow installed (already in requirements)
- PostgreSQL and `.env` with `DB_URL`, `JWT_SECRET_KEY`, and `MLFLOW_*` if using the registry
- Optional: override `MLFLOW_BACKEND_STORE_URI`, `MLFLOW_ARTIFACT_ROOT`, `MLFLOW_PORT`, `API_PORT`

## Run
```bash
chmod +x start.sh stop.sh
./start.sh           # starts MLflow, runs retrain_rolling_mlflow.py, then uvicorn app.api:app
```
- By default MLflow uses the local `mlruns/` (file://) if backend-store/artifact-root are not provided.
- Set `TRAIN_ON_START=0` to skip the retrain step at startup.

API docs: `http://0.0.0.0:8080/docs` (or the `API_PORT` you set).

## Stop
```bash
./stop.sh
```
The script stops MLflow and FastAPI using the PID files under `.run/`.
