"""
Kiểm tra dữ liệu giữa test_fraud_dataset.csv và transaction.csv xem có trùng `transaction_seq,user_seq` hay không.
Nếu có, ghi các bản ghi trùng vào file CSV riêng để tiện kiểm tra.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare overlap between test_fraud_dataset.csv and transaction.csv.")
    parser.add_argument(
        "--test-path",
        default="data/test_fraud_dataset.csv",
        help="Đường dẫn tới file test chứa `transaction_seq,user_seq`."
    )
    parser.add_argument(
        "--transaction-path",
        default="data/transaction.csv",
        help="Đường dẫn tới file transaction gốc."
    )
    parser.add_argument(
        "--overlap-out",
        default="data/test_transaction_overlap.csv",
        help="Đường dẫn file CSV để lưu các cặp trùng."
    )
    parser.add_argument(
        "--summary-out",
        default="data/test_transaction_overlap_summary.txt",
        help="Đường dẫn file tóm tắt kết quả kiểm tra."
    )
    return parser.parse_args()


def load_key_pairs(path: Path, key_cols: list[str]) -> pd.DataFrame:
    df = pd.read_csv(path, usecols=key_cols)
    df = df.drop_duplicates()
    return df


def write_summary(
    summary_path: Path,
    *,
    test_rows: int,
    transaction_rows: int,
    overlap_rows: int,
) -> None:
    summary = (
        f"Rows in test dataset        : {test_rows}\n"
        f"Rows in transaction dataset : {transaction_rows}\n"
        f"Overlap rows (unique pairs) : {overlap_rows}\n"
    )
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(summary, encoding="utf-8")


def main() -> None:
    args = parse_args()
    key_cols = ["transaction_seq", "user_seq"]

    test_path = Path(args.test_path)
    txn_path = Path(args.transaction_path)
    overlap_path = Path(args.overlap_out)
    summary_path = Path(args.summary_out)

    test_df = load_key_pairs(test_path, key_cols)# lấy cặp khóa từ file test
    txn_df = load_key_pairs(txn_path, key_cols) # lấy cặp khóa từ file transaction
    merged = test_df.merge(txn_df, on=key_cols, how="inner") # tìm các cặp trùng

    overlap_count = len(merged)

    write_summary(
        summary_path,
        test_rows=len(test_df),
        transaction_rows=len(txn_df),
        overlap_rows=overlap_count,
    )

    if overlap_count:
        overlap_path.parent.mkdir(parents=True, exist_ok=True)
        merged.to_csv(overlap_path, index=False)
        print(f"Found {overlap_count} overlapping rows. Details saved to: {overlap_path}")
    else:
        print("No overlapping key pairs found.")
    print(f"Summary written to: {summary_path}")


if __name__ == "__main__":
    main()
