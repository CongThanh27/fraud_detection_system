import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import logging
import pandas as pd
import numpy as np
from pathlib import Path
from sqlalchemy import create_engine, text
from app.config import settings
from app.model_io import load_model_and_artifacts
from app.preprocess import prepare_features_for_inference
from app.scoring import score_and_decide
from app.explain import batch_explanations
from utils.logging_utils import configure_logging
LOGGER = logging.getLogger(__name__)

SQL_RECENT = """
WITH recent AS (
  SELECT t.seq AS transaction_seq, u.seq AS user_seq, t.create_dt,
         t.deposit_amount, t.receiving_country, p.country_code, p.id_type,
         p.stay_qualify, p.visa_expire_date, u.name AS user_name,
         COALESCE(
           (SELECT deposit_name FROM kibnet_account_issued k WHERE ukey = t.seq::text),
           (SELECT account_holder_name FROM op_withdraw o2 WHERE transaction_seq = t.seq),
           (SELECT account_holder FROM account_transfer_issued 
            WHERE remittance_type = 'OVERSEA_TRANSACTION' AND related_seq = t.seq)
         ) AS sender_name,
         t.recipient_name, pi.method AS payment_method,
         (SELECT DISTINCT ON (user_seq_no) account_number
            FROM op_log_user_register
           WHERE rsp_code='A0000' AND user_seq_no=o.user_seq_no
           ORDER BY user_seq_no, seq DESC) AS autodebit_account,
         (SELECT DISTINCT ON (user_seq) update_dt::date
            FROM id_approval
           WHERE user_seq = u.seq
           ORDER BY user_seq, seq) AS register_date,
         (SELECT t2.create_dt::date
            FROM transaction_info t2
           WHERE t2.user_seq=u.seq AND t2.category=3
           ORDER BY t2.seq LIMIT 1) AS first_transaction_date,
         u.birth_date,
         (SELECT approve_dt::date
            FROM idcard_recheck
           WHERE uid = p.uid AND status='APPROVED'
           ORDER BY uid, seq DESC LIMIT 1) AS recheck_date,
         u.invite_code,
         (SELECT DISTINCT ON (user_seq) update_dt::date
            FROM face_pin
           WHERE user_seq=u.seq AND active
           ORDER BY user_seq, seq DESC) AS face_pin_date,
         (SELECT COUNT(*) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '24 hour') AS transaction_count_24hour,
         (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '24 hour') AS transaction_amount_24hour,
         (SELECT COUNT(*) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 week') AS transaction_count_1week,
         (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 week') AS transaction_amount_1week,
         (SELECT COUNT(*) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 month') AS transaction_count_1month,
         (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
           WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 month') AS transaction_amount_1month
    FROM transaction_info t
    JOIN user_info u ON u.seq=t.user_seq
    JOIN personal_identification p ON p.uid=u.uid
    LEFT JOIN payment_info pi ON pi.transaction_seq=t.seq
    LEFT JOIN op_token o ON o.user_seq=u.seq
   WHERE t.create_dt >= NOW() - (:mins * INTERVAL '1 minute')
)
SELECT r.*
FROM recent r
LEFT JOIN fraud_scores fs ON fs.transaction_seq = r.transaction_seq
WHERE fs.transaction_seq IS NULL;
"""

MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations" / "001_create_fraud_tables.sql"
LOGGER = logging.getLogger(__name__)

def ensure_tables(conn):
    """
    Đảm bảo các bảng fraud_scores / fraud_explanations tồn tại trước khi ghi dữ liệu.
    """
    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    conn.execute(text(sql))


def upsert_scores(conn, df, model_version, th_low, th_high):
    sql = """
    INSERT INTO fraud_scores (transaction_seq, scored_at, model_version, score, decision, threshold_low, threshold_high)
    VALUES (:transaction_seq, NOW(), :model_version, :score, :decision, :th_low, :th_high)
    ON CONFLICT (transaction_seq) DO UPDATE
      SET scored_at=EXCLUDED.scored_at,
          model_version=EXCLUDED.model_version,
          score=EXCLUDED.score,
          decision=EXCLUDED.decision,
          threshold_low=EXCLUDED.threshold_low,
          threshold_high=EXCLUDED.threshold_high;
    """
    payload = []
    for rec in df.to_dict(orient="records"):
        payload.append({
            **rec,
            "model_version": model_version,
            "th_low": float(th_low),
            "th_high": float(th_high),
        })
    conn.execute(text(sql), payload)

def upsert_expl(conn, expl_df, model_version):
    sql = """
    INSERT INTO fraud_explanations (transaction_seq, scored_at, model_version, reasons_json)
    VALUES (:transaction_seq, NOW(), :model_version, CAST(:reasons_json AS jsonb))
    ON CONFLICT (transaction_seq) DO UPDATE
      SET scored_at=EXCLUDED.scored_at,
          model_version=EXCLUDED.model_version,
          reasons_json=EXCLUDED.reasons_json;
    """
    payload = []
    for _, r in expl_df.iterrows():
        payload.append({"transaction_seq": int(r["id"]), "model_version": model_version, "reasons_json": r["reasons_json"]})
    if payload:
        conn.execute(text(sql), payload)

def main():
    configure_logging()
    model, encoders, schema_pack, th = load_model_and_artifacts()
    feat_cols, medians, clipping_bounds, train_like = schema_pack

    eng = create_engine(settings.DB_URL)
    with eng.begin() as conn:
        LOGGER.info("Using migration script at %s", MIGRATION_PATH)
        ensure_tables(conn)

        raw = pd.read_sql(text(SQL_RECENT), conn, params={"mins": settings.BATCH_LOOKBACK_MINUTES})
        LOGGER.info("Fetched %s new transactions to score", len(raw))
        if raw.empty: return

        Xs = prepare_features_for_inference(
          df_raw=raw.copy(),
          feat_cols=feat_cols,
          encoders=encoders,
          medians=medians,
          maybe_cats=["receiving_country","country_code","id_type","stay_qualify","payment_method"],
          clipping_bounds=clipping_bounds 
        )

        scores, decisions = score_and_decide(model, Xs, th["threshold_low"], th["threshold_high"])
        out = pd.DataFrame({
            "transaction_seq": raw["transaction_seq"].astype(int).values,
            "score": scores.astype(float),
            "decision": decisions
        })

        upsert_scores(conn, out, th["model_version"], th["threshold_low"], th["threshold_high"])

        need_expl_idx = np.arange(len(decisions))
        if need_expl_idx.size:
            LOGGER.info("Generating explanations for %s transactions", need_expl_idx.size)
            subset = Xs.iloc[need_expl_idx].copy()
            subset["transaction_seq"] = raw.iloc[need_expl_idx]["transaction_seq"].values
            subset["is_fraud"] = "NO_FRAUD"       
            expl_df = batch_explanations(model, subset, key_col="transaction_seq", top_k=6,
                                         feat_cols=feat_cols, medians=medians)
            
            upsert_expl(conn, expl_df, th["model_version"])
            LOGGER.info("Stored %s explanations", len(expl_df))
            

if __name__ == "__main__":
    main()
