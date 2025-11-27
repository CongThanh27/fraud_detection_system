import os, sys
import logging
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from utils.logging_utils import configure_logging
from scripts.config import settings

configure_logging()


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PYTHON_BIN = os.getenv("PYTHON_BIN", sys.executable)
BATCH_INTERVAL_SECONDS = int(os.getenv("BATCH_INTERVAL_SECONDS", "900"))# 15 phút
RETRAIN_EVERY_N_BATCHES = int(os.getenv("RETRAIN_EVERY_N_BATCHES", "672"))# khoảng 7 ngày nếu chạy mỗi 15 phút

_should_exit = False


def _handle_shutdown(signum, frame):
    global _should_exit
    _should_exit = True


for sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(sig, _handle_shutdown)


def _run_python_script(label: str, relative_path: str) -> int:
    """Chạy một script Python và log kết quả."""
    script_path = PROJECT_ROOT / relative_path
    logging.info("Running %s (%s)", label, script_path)
    result = subprocess.run(
        [PYTHON_BIN, str(script_path)],
        cwd=PROJECT_ROOT,
        check=False,
    )
    if result.returncode == 0:
        logging.info("%s completed successfully", label)
    else:
        logging.error("%s exited with code %s", label, result.returncode)
    return result.returncode


def main() -> None:
    logging.info(
        "Scheduler starting: batch every %ss, retrain every %s batches",
        BATCH_INTERVAL_SECONDS,
        RETRAIN_EVERY_N_BATCHES,
    )

    batch_count = 0
    while not _should_exit:
        batch_count += 1
        loop_started = time.monotonic()

        _run_python_script("batch job", "app/batch_job.py")

        if batch_count % RETRAIN_EVERY_N_BATCHES == 0:
            _run_python_script("retrain rolling (MLflow)", "scripts/retrain_rolling_mlflow.py")

        elapsed = time.monotonic() - loop_started
        sleep_seconds = max(0.0, BATCH_INTERVAL_SECONDS - elapsed)
        logging.info("Loop done in %.2fs; sleeping %.2fs", elapsed, sleep_seconds)

        slept = 0.0
        while slept < sleep_seconds and not _should_exit:
            interval = min(1.0, sleep_seconds - slept)
            time.sleep(interval)
            slept += interval

    logging.info("Scheduler received shutdown signal; exiting.")


if __name__ == "__main__":
    main()
