import os
import logging
from datetime import datetime, timedelta, timezone
import pandas as pd
from sqlalchemy import create_engine
from data.sql import fetch_nonfraud, fetch_fraud_from_table, fetch_fraud_from_seq_list
LOGGER = logging.getLogger(__name__)

def fetch_data_window(
    db_url: str,
    window_months: int,
    limit_nonfraud: int,
    use_fraud_table: bool,
    fraud_seqs_csv: str,
    out_nonfraud: str,
    out_fraud: str,
    end_date: str = None
):
    tz = timezone.utc
    end_dt = (datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=tz) 
              if end_date else datetime.now(tz))
    start_dt = end_dt - timedelta(days=30*window_months)
    LOGGER.info(f"Fetching data from {start_dt.date()} to {end_dt.date()}")

    eng = create_engine(db_url)
    with eng.begin() as conn: 
        nf = fetch_nonfraud(conn, start_dt, end_dt, limit_nonfraud)
        if use_fraud_table:
            fr = fetch_fraud_from_table(conn, start_dt, end_dt)
        else:
            if not fraud_seqs_csv or not os.path.exists(fraud_seqs_csv):
                raise FileNotFoundError(f"Provide --fraud-seqs-csv when --use-fraud-table is false. Path: {fraud_seqs_csv}")
            seqs = pd.read_csv(fraud_seqs_csv)["seq"].dropna().astype(int).unique().tolist()
            fr = fetch_fraud_from_seq_list(conn, start_dt, end_dt, seqs)

    nf.to_csv(out_nonfraud, index=False)
    fr.to_csv(out_fraud, index=False)
    LOGGER.info("Wrote %s (%s) and %s (%s)", out_nonfraud, f"{len(nf):,}", out_fraud, f"{len(fr):,}")
