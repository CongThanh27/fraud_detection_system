# data/sql.py
from sqlalchemy import text
import pandas as pd

SQL_SKELETON = r"""
SELECT 
  t.seq AS transaction_seq,
  u.seq AS user_seq,
  t.create_dt,
  t.deposit_amount,
  t.receiving_country,
  p.country_code,
  p.id_type,
  p.stay_qualify,
  p.visa_expire_date,
  u.name AS user_name,
  COALESCE(
    (SELECT deposit_name FROM kibnet_account_issued k WHERE ukey = t.seq::text),
    (SELECT account_holder_name FROM op_withdraw o2 WHERE transaction_seq = t.seq),
    (SELECT account_holder FROM account_transfer_issued 
     WHERE remittance_type = 'OVERSEA_TRANSACTION' AND related_seq = t.seq)
  ) AS sender_name,
  t.recipient_name,
  pi.method AS payment_method,
  (SELECT DISTINCT ON (user_seq_no) account_number
     FROM op_log_user_register
    WHERE rsp_code='A0000' AND user_seq_no=o.user_seq_no
    ORDER BY user_seq_no, seq DESC) AS autodebit_account,
  (SELECT DISTINCT ON (user_seq) update_dt::date
     FROM id_approval
    WHERE user_seq=u.seq
    ORDER BY user_seq, seq) AS register_date,
  (SELECT t2.create_dt::date
     FROM transaction_info t2
    WHERE t2.user_seq=u.seq AND t2.category=3
    ORDER BY t2.seq LIMIT 1) AS first_transaction_date,
  u.birth_date,
  (SELECT approve_dt::date
     FROM idcard_recheck
    WHERE uid=p.uid AND status='APPROVED'
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
WHERE t.create_dt >= :start_dt AND t.create_dt < :end_dt
"""

SQL_NONFRAUD = f"""
WITH nf AS (
  SELECT t.seq
  FROM transaction_info t
  WHERE t.create_dt >= :start_dt AND t.create_dt < :end_dt
  ORDER BY random()
  LIMIT :limit_nf
)
{SQL_SKELETON}
AND t.seq IN (SELECT seq FROM nf)
"""

SQL_FRAUD_FROM_TABLE = f"""
WITH f AS (
  SELECT fl.transaction_seq AS seq
  FROM fraud_labels fl
  JOIN transaction_info t ON t.seq = fl.transaction_seq
  WHERE fl.status IN ('CONFIRMED','CHARGEBACK')
    AND t.create_dt >= :start_dt AND t.create_dt < :end_dt
)
{SQL_SKELETON}
AND t.seq IN (SELECT seq FROM f)
"""

# Hàm lấy dữ liệu non-fraud
def fetch_nonfraud(conn, start_dt, end_dt, limit_nf: int) -> pd.DataFrame:
    return pd.read_sql(text(SQL_NONFRAUD), conn, params={"start_dt": start_dt, "end_dt": end_dt, "limit_nf": limit_nf})

# Hàm lấy dữ liệu fraud từ bảng fraud_labels
def fetch_fraud_from_table(conn, start_dt, end_dt) -> pd.DataFrame:
    return pd.read_sql(text(SQL_FRAUD_FROM_TABLE), conn, params={"start_dt": start_dt, "end_dt": end_dt})

# Hàm lấy dữ liệu fraud từ danh sách seq transaction
def fetch_fraud_from_seq_list(conn, start_dt, end_dt, seq_list):
    if not seq_list:
        return pd.DataFrame()
    values = ",".join(f"({int(s)})" for s in seq_list)
    sql = f"WITH f(seq) AS (VALUES {values})\n{SQL_SKELETON}\nAND t.seq IN (SELECT seq FROM f)"
    return pd.read_sql(text(sql), conn, params={"start_dt": start_dt, "end_dt": end_dt})
