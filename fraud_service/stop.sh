#!/usr/bin/env bash
set -euo pipefail

# stop.sh (improved)
# Stops services started by start.sh:
# - stops processes referenced by pid files
# - kills any process listening on common ports (5001, 8000, 5432)
# - stops/removes docker compose stack

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT}/.run"
LOG_DIR="${ROOT}/logs"
DOCKER_COMPOSE_FILE="${ROOT}/docker-compose.yml"
POSTGRES_NAME="${POSTGRES_CONTAINER_NAME:-postgres-fraud-service}"

# stop by pid file (graceful then force)
stop_with_pid() {
  local name="$1"; local pid_file="$2"
  if [[ ! -f "${pid_file}" ]]; then
    echo "[skip] ${name}: no pid file at ${pid_file}"
    return
  fi
  local pid; pid="$(cat "${pid_file}")"
  if kill -0 "${pid}" 2>/dev/null; then
    echo "[stop] ${name} PID ${pid}"
    kill "${pid}" 2>/dev/null || true
    sleep 2
    if kill -0 "${pid}" 2>/dev/null; then
      echo "[warn] ${name} did not stop, forcing kill ${pid}"
      kill -9 "${pid}" 2>/dev/null || true
    fi
    echo "[ok] ${name} stopped"
  else
    echo "[warn] ${name}: pid ${pid} not running"
  fi
  rm -f "${pid_file}" || true
}

# kill processes listening on a port (soft then force)
kill_listening_port() {
  local port="$1"
  echo "[action] Checking listeners on port ${port}..."
  # list pids listening
  pids=$(lsof -nP -iTCP:${port} -sTCP:LISTEN -t || true)
  if [[ -z "${pids}" ]]; then
    echo "[ok] no listeners on ${port}"
    return
  fi
  for pid in ${pids}; do
    echo "[stop] sending TERM to PID ${pid} (port ${port})"
    kill "${pid}" 2>/dev/null || true
  done
  sleep 2
  # force kill remaining
  pids2=$(lsof -nP -iTCP:${port} -sTCP:LISTEN -t || true)
  if [[ -n "${pids2}" ]]; then
    for pid in ${pids2}; do
      echo "[force] killing PID ${pid} (port ${port})"
      kill -9 "${pid}" 2>/dev/null || true
    done
  fi
  echo "[ok] cleared listeners on ${port}"
}

echo "========================================="
echo " Bước 1: Dừng các dịch vụ bằng pid files"
echo "========================================="

stop_with_pid "FastAPI" "${RUN_DIR}/api.pid"

echo "========================================="
echo " Bước 2: Dừng các dịch vụ Python (MLflow)"
echo "========================================="

stop_with_pid "MLflow" "${RUN_DIR}/mlflow.pid"

echo "========================================="
echo "Bước 3: Dừng và XÓA dịch vụ Postgres (Database)"
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
echo " Dừng tiến trình listening trên cổng (5001,8000,5432)"
echo "========================================="

# ports to check
ports=(5001 8080 5432)
for p in "${ports[@]}"; do
  kill_listening_port "${p}"
done

echo "========================================="
echo "[debug] Listening sockets after stop (5001,8000,5432):"
sudo lsof -nP -iTCP:5001 -sTCP:LISTEN || echo "5001: free"
sudo lsof -nP -iTCP:8000 -sTCP:LISTEN || echo "8080: free"
sudo lsof -nP -iTCP:5432 -sTCP:LISTEN || echo "5432: free"

echo "========================================="
echo "[done] stop.sh completed"
echo "========================================="
