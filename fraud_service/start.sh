#!/usr/bin/env bash
set -euo pipefail

# Simple launcher for MLflow Tracking, optional retrain, Postgres DB, and FastAPI (app/api.py).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT}/.run"
LOG_DIR="${ROOT}/logs"


# =======================================================
# BỔ SUNG LỆNH DỪNG DỊCH VỤ CŨ (stop.sh)
# =======================================================
STOP_SCRIPT="${ROOT}/stop.sh"
if [[ -f "${STOP_SCRIPT}" ]]; then
  echo "=========================================="
  echo "        🛑 DỪNG DỊCH VỤ CŨ BẰNG stop.sh"
  echo "=========================================="
  "${STOP_SCRIPT}"
  echo "=========================================="
  echo "        ✅ STOP HOÀN TẤT, BẮT ĐẦU START"
  echo "=========================================="
else
  echo "[warning] ${STOP_SCRIPT} not found. Skipping cleanup step."
fi
# =======================================================

# Định nghĩa các biến môi trường ảo
VENV_DIR="${ROOT}/.venv"
PYTHON_BIN="${VENV_DIR}/bin/python3"
PIP_BIN="${VENV_DIR}/bin/pip"
MLFLOW_BIN="${VENV_DIR}/bin/mlflow"

# Ports / configs
MLFLOW_PORT="${MLFLOW_PORT:-5001}"
API_PORT="${API_PORT:-8080}"             # port cho FastAPI trên host
BACKEND_URI="${MLFLOW_BACKEND_STORE_URI:-file://${ROOT}/mlruns}"
ARTIFACT_ROOT="${MLFLOW_ARTIFACT_ROOT:-${ROOT}/mlruns}"
TRAIN_ON_START="${TRAIN_ON_START:-1}"

# --- Bước 0: Setup môi trường và Dependencies ---
echo "[setup] Creating required directories..."
mkdir -p "${RUN_DIR}" "${LOG_DIR}"

# 0a. Tạo file .env nếu chưa có
ENV_FILE="${ROOT}/.env"
ENV_EXAMPLE="${ROOT}/.env.example"
if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ -f "${ENV_EXAMPLE}" ]]; then
    echo "[setup] Copying ${ENV_EXAMPLE} to ${ENV_FILE}"
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  else
    echo "[warning] ${ENV_EXAMPLE} not found. Skipping .env creation."
  fi
else
  echo "[skip] ${ENV_FILE} already exists."
fi

# Load .env if available so MLflow picks up MLFLOW_*, DB_URL, etc.
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC2046
  set -a && source "${ENV_FILE}" && set +a
fi

# 0b. Tạo và cài đặt Môi trường ảo (Virtual Environment)
echo "[setup] Setting up virtual environment..."

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[setup] Creating virtual environment at ${VENV_DIR}..."
  python3 -m venv "${VENV_DIR}"
else
  echo "[skip] Virtual environment already exists."
fi

# Cài đặt các thư viện Python (Sử dụng pip của VENV)
echo "[setup] Installing Python dependencies from requirements.txt using VENV's pip..."
"${PIP_BIN}" install -r "${ROOT}/requirements.txt"

# --- Bước 1: Khởi động Dịch vụ Postgres bằng Docker Compose ---

DOCKER_COMPOSE_FILE="${ROOT}/docker-compose.yml"

if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker before running."
    exit 1
fi

if [[ ! -f "${DOCKER_COMPOSE_FILE}" ]]; then
    echo "[ERROR] Docker Compose configuration file not found at: ${DOCKER_COMPOSE_FILE}"
    exit 1
fi

echo "[start] Starting Postgres database using docker compose..."
docker compose -f "${DOCKER_COMPOSE_FILE}" up -d postgres

# Wait for docker container to start (will verify readiness below)
echo "[info] Waiting for Postgres container to start..."
sleep 2

# --- Bước 1b: Database Migrations (ĐÃ BỔ SUNG) ---

echo "[run] Applying SQL Migrations..."

# Định nghĩa các biến kết nối DB (Lấy từ docker-compose/mặc định / .env)
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-fraud_detection-db}"
DB_CONTAINER="${POSTGRES_CONTAINER_NAME:-postgres-fraud-service}" # fallback tên container

# Đường dẫn đến các file SQL cần chạy
SQL_FILE_1="${ROOT}/migrations/001_create_fraud_tables.sql"
SQL_FILE_2="${ROOT}/migrations/002_create_auth_tables.sql"

# Wait for Postgres to accept connections (pg_isready) with timeout
MAX_WAIT=60
i=0
echo "[wait] Waiting for Postgres to be ready (pg_isready)..."
while true; do
  if docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
    echo "[ok] Postgres is accepting connections."
    break
  fi
  i=$((i+1))
  if [ $i -ge $MAX_WAIT ]; then
    echo "[ERROR] Postgres did not become ready within ${MAX_WAIT}s. Showing recent logs:"
    docker logs "${DB_CONTAINER}" --tail 200 || true
    exit 1
  fi
  sleep 1
done

# Hàm chạy SQL trong container
run_migration() {
    local sql_file="$1"
    if [[ ! -f "${sql_file}" ]]; then
        echo "[warning] SQL file not found: ${sql_file}. Skipping."
        return
    fi
    echo "[migration] Running ${sql_file}..."
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${sql_file}"
    echo "[ok] Migration successful for $(basename "${sql_file}")."
}

# Chạy cả hai file migration (nếu có)
run_migration "${SQL_FILE_1}"
run_migration "${SQL_FILE_2}"

# --- Hàm hỗ trợ khởi động dịch vụ (MLflow / API) ---

start_with_pid() {
  local name="$1"
  local cmd="$2"
  local log_file="$3"
  local pid_file="$4"

  if [[ -f "${pid_file}" ]] && kill -0 "$(cat "${pid_file}")" 2>/dev/null; then
    echo "[skip] ${name} already running with PID $(cat "${pid_file}")"
    return
  fi

  echo "[start] ${name} -> ${cmd}"
  nohup bash -c "cd \"${ROOT}\" && ${cmd}" >"${log_file}" 2>&1 &
  echo $! >"${pid_file}"
  echo "[ok] ${name} PID $(cat "${pid_file}") (logs: ${log_file})"
}

# --- Bước 2: Khởi động MLflow Tracking Server ---

start_with_pid "MLflow" \
  "${MLFLOW_BIN} server --host 0.0.0.0 --port ${MLFLOW_PORT} --backend-store-uri \"${BACKEND_URI}\" --default-artifact-root \"${ARTIFACT_ROOT}\"" \
  "${LOG_DIR}/mlflow.log" \
  "${RUN_DIR}/mlflow.pid"

# --- Bước 2b: Khởi động FastAPI (app/api.py) bằng uvicorn ---
# Lưu ý: file app/api.py phải export FastAPI instance tên `app`.
# Nếu bạn muốn chạy với gunicorn/uvicorn workers, có thể sửa lệnh tương ứng.

UVICORN_MODULE="${UVICORN_MODULE:-app.api:app}"   # module:object
UVICORN_CMD="${PYTHON_BIN} -m uvicorn ${UVICORN_MODULE} --host 0.0.0.0 --port ${API_PORT} --loop auto --reload --workers 1"

start_with_pid "FastAPI" \
  "${UVICORN_CMD}" \
  "${LOG_DIR}/api.log" \
  "${RUN_DIR}/api.pid"

# --- Bước 3: Chạy script retrain một lần (Tùy chọn) ---

if [[ "${TRAIN_ON_START}" == "1" ]]; then
  echo "[run] ${PYTHON_BIN} scripts/retrain_rolling_mlflow.py"
  (cd "${ROOT}" && "${PYTHON_BIN}" scripts/retrain_rolling_mlflow.py)
else
  echo "[skip] TRAIN_ON_START=0 -> skip retraining"
fi

echo "=========================================================="
echo "[done] Services ready."
echo "✅ MLflow Tracking Server: http://0.0.0.0:${MLFLOW_PORT}"
echo "✅ FastAPI (app/api.py) running: http://0.0.0.0:${API_PORT}/docs"
echo "✅ Postgres Database (container): ${DB_CONTAINER}"
echo "=========================================================="
echo "Logs: ${LOG_DIR}"
echo "PIDs: ${RUN_DIR}"