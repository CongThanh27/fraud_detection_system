#!/usr/bin/env bash
set -euo pipefail

# Stop services started by launcher.sh using stored PID files and Docker Compose.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT}/.run"

# Định nghĩa đường dẫn tới docker-compose.yml (ở thư mục cha)
DOCKER_COMPOSE_FILE="${ROOT}/../docker-compose.yml"

# --- Hàm dừng các tiến trình Python (MLflow) ---

stop_with_pid() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "${pid_file}" ]]; then
    echo "[skip] ${name}: no pid file at ${pid_file}"
    return
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if kill -0 "${pid}" 2>/dev/null; then
    echo "[stop] ${name} PID ${pid}"
    kill "${pid}" 2>/dev/null || true
    # Chờ tiến trình kết thúc để đảm bảo
    wait "${pid}" 2>/dev/null || true
    echo "[ok] ${name} stopped"
  else
    echo "[warn] ${name}: pid ${pid} not running"
  fi

  rm -f "${pid_file}"
}

echo "========================================="
echo " Bước 1: Dừng các dịch vụ Python (MLflow)"
echo "========================================="

stop_with_pid "MLflow" "${RUN_DIR}/mlflow.pid"
# stop_with_pid "FastAPI" "${RUN_DIR}/api.pid" <--- ĐÃ LOẠI BỎ

# --- Bước 2: Dừng và XÓA container Postgres (Docker Compose) ---

echo "========================================="
echo "Bước 2: Dừng và XÓA dịch vụ Postgres (Database)"
echo "========================================="

if command -v docker &> /dev/null; then
    # Kiểm tra sự tồn tại của file cấu hình Docker Compose
    if [[ -f "${DOCKER_COMPOSE_FILE}" ]]; then
        echo "[action] Stopping and removing Postgres container..."
        # Dùng 'down' để dừng và xóa container/network/volumes liên quan
        docker compose -f "${DOCKER_COMPOSE_FILE}" down --volumes --remove-orphans --timeout 0 postgres
        echo "[ok] Postgres container stopped and removed."
    else
        echo "[skip] Docker Compose file not found at: ${DOCKER_COMPOSE_FILE}. Cannot remove container."
    fi
else
    echo "[skip] Docker not found. Cannot stop/remove Postgres container."
fi

echo "========================================="
echo "[done] stop.sh completed"