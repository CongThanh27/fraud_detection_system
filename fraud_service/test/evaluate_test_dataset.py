"""
Utility script to evaluate the current fraud model on a labeled CSV.

Steps:
1. Split the `fraud_label` column into a standalone file.
2. Persist the feature-only CSV that will be sent to the model.
3. Run predictions with the deployed model artifacts.
4. Compare predictions against the saved labels and report accuracy.
"""

from __future__ import annotations  # Bật annotation kiểu trả về dạng string (PEP 563) để tránh lỗi vòng lặp import.

import argparse  # Thư viện chuẩn để đọc tham số dòng lệnh.
from pathlib import Path  # Hỗ trợ thao tác đường dẫn độc lập OS.
import sys  # Dùng để bổ sung đường dẫn project vào sys.path.

import numpy as np  # Xử lý mảng số học và thống kê.
import pandas as pd  # Đọc/ghi và thao tác dữ liệu dạng bảng.

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # Xác định thư mục gốc của project.
if str(PROJECT_ROOT) not in sys.path:  # Chỉ thêm đường dẫn nếu chưa tồn tại để tránh trùng lặp.
    sys.path.append(str(PROJECT_ROOT))  # Cho phép import module nội bộ như app.model_io.

from app.model_io import load_model_and_artifacts  # Hàm tải model hiện tại và các artifacts liên quan.
from app.preprocess import prepare_features_for_inference  # Hàm chuẩn hóa dữ liệu đầu vào theo schema huấn luyện.
from app.scoring import decide, fraud_scores_from_model  # Hàm tính xác suất gian lận và ra quyết định theo ngưỡng.

MAYBE_CATEGORICALS = ["receiving_country", "country_code", "id_type", "stay_qualify", "payment_method"]  # Danh sách cột có thể là categorical để encode.


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate fraud model against a labeled test CSV.")  # Tạo parser với mô tả ngắn gọn.
    parser.add_argument(
        "--input",
        default="data/test_fraud_dataset.csv",
        help="Path to the CSV containing features and `fraud_label`.",  # Đường dẫn file đầu vào chứa dữ liệu và nhãn.
    )
    parser.add_argument(
        "--features-out",
        default="data/test_fraud_features.csv",
        help="Output path for the feature-only CSV (label removed).",  # File xuất chứa dữ liệu không có cột nhãn.
    )
    parser.add_argument(
        "--labels-out",
        default="data/test_fraud_labels.csv",
        help="Output path for the extracted `fraud_label` column.",  # File xuất chỉ chứa cột nhãn fraud.
    )
    parser.add_argument(
        "--predictions-out",
        default="data/test_fraud_predictions.csv",
        help="Output path for predictions joined with the original labels.",  # File xuất chứa dự đoán và so sánh với nhãn gốc.
    )
    parser.add_argument(
        "--misclassified-out",
        default="data/test_fraud_misclassified.csv",
        help="Output path for rows predicted incorrectly at threshold_low.",  # File xuất riêng cho các dòng dự đoán sai.
    )
    parser.add_argument(
        "--below-threshold-out",
        default="data/test_fraud_false_negatives.csv",
        help=(
            "Output path for rows predicted as non-fraud (score < threshold_low) "
            "but labeled fraud (false negatives)."
        ),  # File lưu các bản ghi dưới ngưỡng nhưng vẫn là gian lận.
    )
    return parser.parse_args()  # Trả về đối tượng tham số đã parse.


def _ensure_parent(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)  # Đảm bảo thư mục đích tồn tại trước khi ghi file.


def main() -> None:
    args = _parse_args()  # Đọc tham số dòng lệnh.

    df = pd.read_csv(args.input)  # Nạp toàn bộ bộ dữ liệu kiểm thử.
    if "fraud_label" not in df.columns:  # Kiểm tra bắt buộc phải có cột nhãn.
        raise ValueError(f"Input CSV `{args.input}` is missing required column `fraud_label`.")  # Thông báo lỗi rõ ràng khi thiếu nhãn.

    if "create_dt_str" in df.columns and "create_dt" not in df.columns:  # Phần lớn dữ liệu dùng cột create_dt_str; đổi tên để phù hợp pipeline.
        df = df.rename(columns={"create_dt_str": "create_dt"})  # Đồng bộ tên cột để hàm df_align có thể xử lý thời gian.

    labels = df["fraud_label"].astype(int)  # Lấy cột nhãn và ép về kiểu số nguyên (0/1).
    features = df.drop(columns=["fraud_label"])  # Phần còn lại là đặc trưng dùng để dự đoán.

    _ensure_parent(args.labels_out)  # Tạo thư mục đích cho file nhãn nếu cần.
    labels.to_csv(args.labels_out, index=False, header=["fraud_label"])  # Ghi cột nhãn ra file riêng.

    _ensure_parent(args.features_out)  # Tạo thư mục nếu cần cho file đặc trưng.
    features.to_csv(args.features_out, index=False)  # Ghi dữ liệu không có nhãn ra file để gửi cho mô hình.

    # Reload the feature-only CSV to mimic the downstream scoring workflow.
    features_only = pd.read_csv(args.features_out)  # Đọc lại file đặc trưng để mô phỏng đúng quy trình scoring thực tế.

    model, encoders, schema_pack, thresholds = load_model_and_artifacts()  # Tải model hiện hành cùng bộ encoder, schema, và ngưỡng ra quyết định.
    feat_cols, medians, _ = schema_pack  # Giải nén danh sách cột, median và bản mẫu training.
    X = prepare_features_for_inference(features_only, feat_cols, encoders, medians, MAYBE_CATEGORICALS)  # Chuẩn hóa dữ liệu đầu vào theo schema đã huấn luyện.

    scores = fraud_scores_from_model(model, X)  # Tính xác suất gian lận từ mô hình (P(FRAUD)).
    th_low = float(thresholds.get("threshold_low", 0.5))  # Lấy ngưỡng REVIEW từ artifacts, fallback 0.5 nếu thiếu.
    print(f"Using threshold_low: {th_low:.4f}")  # In ngưỡng REVIEW đang sử dụng.
    th_high = float(thresholds.get("threshold_high", th_low))  # Lấy ngưỡng BLOCK, fallback về th_low nếu không tồn tại.
    print(f"Using threshold_high: {th_high:.4f}")  # In ngưỡng BLOCK đang sử dụng.
    decisions = decide(scores, th_low, th_high)  # Suy ra quyết định ALLOW/REVIEW/BLOCK dựa trên hai ngưỡng.

    preds_review = (scores >= th_low).astype(int)  # Biến nhị phân: >= th_low xem như FRAUD để đo độ chính xác REVIEW. Ví du dụ, REVIEW và BLOCK đều xem là dự đoán FRAUD.
    print(f"Preds review sample: {preds_review[:5]}")  # In mẫu nhãn dự đoán theo ngưỡng REVIEW để kiểm tra nhanh.
    preds_block = (scores >= th_high).astype(int)  # Biến nhị phân: >= th_high xem như FRAUD để đo độ chính xác BLOCK.
    print(f"Preds block sample: {preds_block[:5]}")  # In mẫu nhãn dự đoán theo ngưỡng BLOCK để kiểm tra nhanh.
    labels_array = labels.to_numpy()  # Chuyển nhãn thật sang ndarray để so sánh nhanh. ví dụ [0,1,0,0,1,...]

    accuracy_review = float(np.mean(preds_review == labels_array))  # Độ chính xác khi dùng th_low làm ranh giới FRAUD. ví dụ: tổng số dự đoán đúng chia tổng số mẫu.
    accuracy_block = float(np.mean(preds_block == labels_array))  # Độ chính xác khi dùng th_high làm ranh giới FRAUD. vi dụ: tổng số dự đoán đúng chia tổng số mẫu.
    wrong_mask = preds_review != labels_array  # True ở các dòng dự đoán sai so với nhãn thật (dựa trên th_low).
    wrong_indices = np.where(wrong_mask)[0]  # Lấy index (0-based) của các dòng sai để báo cáo.
    false_neg_mask = (preds_review == 0) & (labels_array == 1)  # Đánh dấu các dòng dự đoán dưới ngưỡng nhưng nhãn thật là FRAUD.
    false_neg_indices = np.where(false_neg_mask)[0]  # Lấy index cho false negatives.

    results = features_only.copy()  # Bảng kết quả bắt đầu từ dữ liệu đầu vào để tiện kiểm tra.
    results["score"] = scores  # Lưu tỷ lệ xác suất gian lận.
    results["decision"] = decisions  # Lưu nhãn quyết định ALLOW/REVIEW/BLOCK.
    results["pred_label_review"] = preds_review  # Lưu nhãn nhị phân theo ngưỡng REVIEW.
    results["pred_label_block"] = preds_block  # Lưu nhãn nhị phân theo ngưỡng BLOCK.
    results["fraud_label"] = labels_array  # Gắn lại nhãn thật để tiện so sánh.

    _ensure_parent(args.predictions_out)  # Đảm bảo thư mục đích tồn tại trước khi ghi file kết quả.
    results.to_csv(args.predictions_out, index=False)  # Xuất toàn bộ dự đoán kèm nhãn thật ra CSV.

    if wrong_indices.size:  # Nếu có bản ghi sai thì lưu riêng ra file để tiện kiểm tra.
        misclassified = results.iloc[wrong_indices].copy()  # Trích xuất các dòng sai.
        _ensure_parent(args.misclassified_out)  # Đảm bảo thư mục tồn tại.
        misclassified.to_csv(args.misclassified_out, index=False)  # Ghi ra CSV riêng.
        print(f"Misclassified rows saved to: {args.misclassified_out}")  # Thông báo đường dẫn file sai lệch.
    if false_neg_indices.size:  # Nếu có bản ghi dưới ngưỡng nhưng là gian lận, xuất file riêng.
        false_negatives = results.iloc[false_neg_indices].copy()  # Trích xuất false negatives.
        _ensure_parent(args.below_threshold_out)  # Đảm bảo thư mục tồn tại.
        false_negatives.to_csv(args.below_threshold_out, index=False)  # Ghi ra CSV riêng.
        print(f"False negatives saved to: {args.below_threshold_out}")  # Thông báo đường dẫn file dưới ngưỡng.

    print(f"Extracted labels saved to: {args.labels_out}")  # Thông báo vị trí file nhãn.
    print(f"Feature-only CSV saved to: {args.features_out}")  # Thông báo vị trí file đặc trưng.
    print(f"Predictions with labels saved to: {args.predictions_out}")  # Thông báo vị trí file kết quả dự đoán.
    print(f"Rows evaluated: {len(results):,}")  # Hiển thị số lượng bản ghi được đánh giá.
    print(f"Accuracy at threshold_low ({th_low:.4f}): {accuracy_review:.2%}")  # In độ chính xác ứng với ngưỡng REVIEW.
    print(f"Accuracy at threshold_high ({th_high:.4f}): {accuracy_block:.2%}")  # In độ chính xác ứng với ngưỡng BLOCK.
    if wrong_indices.size:  # Nếu có bản ghi sai, liệt kê ra để kiểm tra.
        print("Mismatched rows (0-based index):", ", ".join(str(idx) for idx in wrong_indices))
    else:  # Trường hợp tất cả đều đúng, in thông báo rõ ràng.
        print("All rows match the ground truth labels at threshold_low.")
    if false_neg_indices.size:  # Nếu có false negatives, liệt kê riêng.
        print(
            "False negatives (score < threshold_low but fraud_label=1):",
            ", ".join(str(idx) for idx in false_neg_indices),
        )
    else:  # Không có false negatives thì thông báo rõ.
        print("No false negatives under threshold_low.")


if __name__ == "__main__":
    main()  # Gọi hàm chính khi chạy file trực tiếp.
