#!/usr/bin/env bash
set -euo pipefail

# Simple launcher for MLflow Tracking, optional retrain, and Postgres DB. (FastAPI removed)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT}/.run"
LOG_DIR="${ROOT}/logs"

# Định nghĩa các biến môi trường ảo
VENV_DIR="${ROOT}/.venv"
PYTHON_BIN="${VENV_DIR}/bin/python3"
PIP_BIN="${VENV_DIR}/bin/pip"
MLFLOW_BIN="${VENV_DIR}/bin/mlflow"

MLFLOW_PORT="${MLFLOW_PORT:-5001}"
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

DOCKER_COMPOSE_FILE="${ROOT}/../docker-compose.yml"

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

echo "[info] Đợi 5 giây để cơ sở dữ liệu Postgres khởi động..."
sleep 5

# --- Bước 1b: Database Migrations (ĐÃ BỔ SUNG) ---

echo "[run] Applying SQL Migrations..."

# Định nghĩa các biến kết nối DB (Lấy từ docker-compose/mặc định)
DB_USER="${POSTGRES_USER:-postgres}" # Lấy từ .env hoặc mặc định
DB_NAME="${POSTGRES_DB:-fraud_detection-db}" # Lấy từ .env hoặc mặc định
DB_CONTAINER="postgres-fraud-service" # Tên container từ docker-compose.yml

# Đường dẫn đến các file SQL cần chạy
SQL_FILE_1="${ROOT}/migrations/001_create_fraud_tables.sql"
SQL_FILE_2="${ROOT}/migrations/002_create_auth_tables.sql"

# Hàm chạy SQL trong container
run_migration() {
    local sql_file="$1"
    if [[ ! -f "${sql_file}" ]]; then
        echo "[warning] SQL file not found: ${sql_file}. Skipping."
        return
    fi
    echo "[migration] Running ${sql_file}..."
    # Sử dụng docker exec để chạy psql bên trong container
    docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${sql_file}"
    echo "[ok] Migration successful for $(basename "${sql_file}")."
}

# Chạy cả hai file migration
run_migration "${SQL_FILE_1}"
run_migration "${SQL_FILE_2}"

# --- Hàm hỗ trợ khởi động dịch vụ (MLflow) ---

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
  # Chạy lệnh trong nền, đảm bảo sử dụng VENV's binaries nếu cần
  nohup bash -c "cd \"${ROOT}\" && ${cmd}" >"${log_file}" 2>&1 &
  echo $! >"${pid_file}"
  echo "[ok] ${name} PID $(cat "${pid_file}") (logs: ${log_file})"
}

# --- Bước 2: Khởi động MLflow Tracking Server ---

start_with_pid "MLflow" \
  "${MLFLOW_BIN} server --host 0.0.0.0 --port ${MLFLOW_PORT} --backend-store-uri \"${BACKEND_URI}\" --default-artifact-root \"${ARTIFACT_ROOT}\"" \
  "${LOG_DIR}/mlflow.log" \
  "${RUN_DIR}/mlflow.pid"

# --- Bước 3: Chạy script retrain một lần (Tùy chọn) ---

if [[ "${TRAIN_ON_START}" == "1" ]]; then
  echo "[run] ${PYTHON_BIN} scripts/retrain_rolling_mlflow.py"
  # Sử dụng binary python từ VENV để chạy script
  (cd "${ROOT}" && "${PYTHON_BIN}" scripts/retrain_rolling_mlflow.py)
else
  echo "[skip] TRAIN_ON_START=0 -> skip retraining"
fi

echo "=========================================================="
echo "[done] Services ready."
echo "✅ MLflow Tracking Server: http://0.0.0.0:${MLFLOW_PORT}"
echo "✅ Postgres Database đang chạy trên cổng 5432"
echo "=========================================================="