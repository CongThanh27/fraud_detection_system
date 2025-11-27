import logging
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import argparse
from datetime import datetime, timezone

from scripts.fetch_window import fetch_data_window
from scripts.train_and_export_mlflow import train_once, SkipTraining
from scripts.compare_versions_mlflow import compare_and_get_winner 

import mlflow 
from mlflow.tracking import MlflowClient 

from utils.logging_utils import configure_logging
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)
from scripts.config import settings

# configure_azure_credentials_from_settings()
LOGGER = logging.getLogger(__name__)

def main():
    configure_logging()
    ap = argparse.ArgumentParser(description="Rolling 6-month retrain orchestrator (MLflow + alias)")
    ap.add_argument("--db-url", default=settings.DB_URL)
    ap.add_argument("--window-months", type=int, default=settings.WINDOW_MONTHS)
    ap.add_argument("--end-date", default=None)
    ap.add_argument("--limit-nonfraud", type=int, default=settings.LIMIT_NONFRAUD)
    ap.add_argument("--use-fraud-table", action="store_true", default=settings.USE_FRAUD_TABLE)
    ap.add_argument("--fraud-seqs-csv", default=settings.FRAUD_SEQS_CSV)

    ap.add_argument("--model-root", default=settings.MODEL_DIR_TRAIN)
    ap.add_argument("--artifacts-root", default=settings.ARTIFACTS_DIR_TRAIN)
    ap.add_argument("--model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--test-ratio", type=float, default=settings.TEST_RATIO)
    ap.add_argument("--fpr-cap", type=float, default=settings.FPR_CAP)
    ap.add_argument("--recall-tgt", type=float, default=settings.RECALL_TGT)

    ap.add_argument("--auto-promote", action="store_true", help="Bật auto-compare và cập nhật alias trong Registry.")

    ap.add_argument("--mlflow-uri", default=settings.MLFLOW_TRACKING_URI, help="MLflow Tracking URI")
    ap.add_argument("--mlflow-exp", default=settings.MLFLOW_EXPERIMENT_NAME, help="MLflow Experiment Name")
    ap.add_argument("--mlflow-tags", default=settings.MLFLOW_TAGS)
    ap.add_argument("--registered-model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--registry-alias", default=settings.MLFLOW_MODEL_ALIAS, help="Alias trong Model Registry để cập nhật")
    ap.add_argument("--prefer-stages", nargs="*", default=None, help="Ưu tiên stage khi chọn 2 bản so sánh (vd: Staging None)")
    ap.set_defaults(auto_promote=True)

    args = ap.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
 
    mlflow_uri = args.mlflow_uri 
    if mlflow_uri:
        mlflow.set_tracking_uri(mlflow_uri)
        LOGGER.info("MLflow tracking_uri = %s", mlflow_uri)
    else:
        LOGGER.info("Using default MLflow tracking URI.")
        return
    
    # ensure_azure_identity_env()
    client = MlflowClient() 
    #TẢI DỮ LIỆU 
    # try:
    #     LOGGER.info("-----------Fetching data window...-------------")
    #     fetch_data_window(
    #         db_url=args.db_url,
    #         window_months=args.window_months,
    #         limit_nonfraud=args.limit_nonfraud,
    #         use_fraud_table=args.use_fraud_table,
    #         fraud_seqs_csv=args.fraud_seqs_csv,
    #         out_nonfraud=settings.NONFRAUD_CSV_NAME_OUT,
    #         out_fraud=settings.FRAUD_CSV_NAME_OUT,
    #         # out_nonfraud="data/nonfraud_rolling_window.csv",
    #         # out_fraud="data/fraud_rolling_window.csv",
    #         end_date=args.end_date
    #     )
    #     LOGGER.info("Data fetch completed.")
    # except Exception as e:
    #     LOGGER.error("Data fetch failed: %s", e)
    #     return
    try:
        LOGGER.info("-----------Starting training...-------------")
        _ = train_once(
            nonfraud_path=settings.NONFRAUD_CSV_NAME_USE,
            fraud_path=settings.FRAUD_CSV_NAME_USE,
            artifacts_dir=args.artifacts_root,
            model_dir=args.model_root,
            test_ratio=args.test_ratio,
            fpr_cap=args.fpr_cap,
            recall_tgt=args.recall_tgt,
            save_holdout=settings.HOLDOUT_SAVE_NAME,
            stamp=stamp,
            mlflow_exp=args.mlflow_exp,
            mlflow_tags=args.mlflow_tags,
            registered_model_name=args.registered_model_name
        )
        LOGGER.info("Training completed.")
    except SkipTraining as e:
        LOGGER.warning("%s. Rolling job continues without training a new model.", e)
        return
    except Exception as e:
        LOGGER.error("Training failed: %s", e)
        return

    if args.auto_promote:
        LOGGER.info("--- Comparing models in Registry and updating alias... ---")
        
        try:
            winner_version = compare_and_get_winner(
                client=client,
                registered_model_name=args.registered_model_name,
            )
        except Exception as e:
            LOGGER.error("Comparison failed: %s", e)
            return

        if not winner_version.isdigit():
            LOGGER.error("Invalid winner version returned: '%s'", winner_version)
            return

        LOGGER.info("Winner Registry Version: %s", winner_version)

        # Logic cập nhật Alias
        name = args.registered_model_name 
        alias = args.registry_alias 
        prev_version = None
        try:
            prev = client.get_model_version_by_alias(name, alias)
            prev_version = prev.version 
            LOGGER.info("Current alias '%s' points to %s:%s", alias, name, prev_version)
        except Exception:
            pass

        client.set_registered_model_alias(name, alias, int(winner_version))
        if prev_version and str(prev_version) != winner_version: 
            LOGGER.info("Alias '%s' moved %s:%s → %s", alias, name, prev_version, winner_version)
        else:
            LOGGER.info("Alias '%s' now points to %s:%s", alias, name, winner_version) 
        LOGGER.info("--- Auto-promotion completed. ---")
    else:
        LOGGER.info("--- Auto-promotion skipped as per arguments. ---") 

if __name__ == "__main__":
    main()