
## Runtime (API / Batch)
- Build + chạy API realtime: `docker compose up --build api`
- Chạy batch thủ công: `docker compose run --rm batch`
- Khởi chạy API cùng scheduler định kỳ: `docker compose up --build`
- Thay đổi chu kỳ job bằng biến `BATCH_INTERVAL_SECONDS` (mặc định 60 giây) và `RETRAIN_EVERY_N_BATCHES` (mặc định 5, tương ứng 5 phút)

## Huấn luyện / Script hỗ trợ
- Lấy cửa sổ dữ liệu: `docker compose run --rm api python scripts/fetch_window.py`
- Train + log MLflow: `docker compose run --rm api python scripts/train_and_export_mlflow.py`
- Rolling retrain + auto-promote: `docker compose run --rm api python scripts/retrain_rolling_mlflow.py`
- `docker compose run --rm api python scripts/retrain_rolling.py`

## Azure Blob artifact store
- Cung cấp credential dạng service principal qua biến môi trường:
  - `AZURE_TENANT_ID`
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET`
- Hoặc dùng connection string (`AZURE_STORAGE_CONNECTION_STRING`) / account key (`AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY`).
- Các giá trị này có thể khai báo trong `.env` (đã được `load_dotenv()` nạp) hoặc trên hạ tầng deploy (Kubernetes, VM, GitHub Actions, ...). Script sẽ kiểm tra và báo lỗi sớm nếu thiếu credential khi log lên MLflow.

## API authentication
- Thiết lập `JWT_SECRET_KEY` (chuỗi ngẫu nhiên, độ dài lớn) và tùy chọn `JWT_ACCESS_EXPIRE_MINUTES` trong `.env`.
- Tạo người dùng đầu tiên bằng `POST /auth/register` (không cần token). Các lần tạo tiếp theo bắt buộc phải gửi kèm JWT hợp lệ.
- Đăng nhập qua `POST /auth/login` (form dữ liệu chuẩn OAuth2 password grant) để nhận JWT (`access_token`).
- Có thể chủ động thu hồi token bằng `POST /auth/logout`.
- Các endpoint `/score`, `/score/batch`, `/score/upload`, `/reload` yêu cầu header `Authorization: Bearer <access_token>`.
- Bảng `auth_tokens` lưu lại JWT đã phát hành để hệ thống có thể thu hồi, giám sát và ngăn token đã bị thu hồi.

# Tổng Quan Dự Án `fraud_service_main`

## Mục tiêu
Dịch vụ FastAPI phục vụ chấm điểm gian lận giao dịch theo thời gian thực và theo lô, tích hợp mô hình ML (log từ MLflow), cung cấp giải thích, đồng thời hỗ trợ batch job, script huấn luyện và hệ thống xác thực JWT quản lý người dùng/token ngay trong cơ sở dữ liệu.

## Chức năng chính
- **API Scoring** (`app/api.py`):
  - `/score`, `/score/batch`, `/score/upload`: nhận dữ liệu giao dịch (JSON hoặc CSV), chuẩn hóa, encode, chấm điểm, trả về quyết định và lý do.
  - `/reload`: nạp lại mô hình/object mới nhất từ MLflow hoặc thư mục cục bộ.
  - `/health`: kiểm tra trạng thái dịch vụ.
  - `/auth/login`, `/auth/logout`, `/auth/register`: đăng nhập, đăng xuất và quản trị người dùng hệ thống với JWT.
- **Hỗ trợ mô hình và xử lý dữ liệu**:
  - `app/model_io.py`, `app/preprocess.py`, `app/scoring.py`, `app/explain.py`: tải mô hình, chuẩn hóa feature, sinh điểm và giải thích.
  - Thư mục `models/`, `artifacts/` chứa mô hình và output đã huấn luyện.
- **Batch Job** (`app/batch_job.py`):
  - Lấy giao dịch mới, chấm điểm hàng loạt, lưu kết quả vào bảng `fraud_scores` và `fraud_explanations`.
- **Script hỗ trợ** (`scripts/`):
  - `fetch_window.py`: trích xuất dữ liệu theo cửa sổ thời gian phục vụ huấn luyện.
  - `train_and_export_mlflow.py`, `retrain_rolling_mlflow.py`: training/log MLflow, tự động promote phiên bản.
- **Cấu hình & Hạ tầng**:
  - `.env`, `app/config.py`: quản lý biến môi trường (DB, MLflow, JWT, Azure).
  - `docker-compose.yml`, `Dockerfile`: triển khai dịch vụ API/batch.

## Cây thư mục (rút gọn)
```
fraud_service_main/
├── app/
│   ├── __init__.py              
│   ├── api.py                   # Khai báo FastAPI routes (scoring, auth, health)
│   ├── auth.py                  # Logic JWT: băm mật khẩu, phát/thu hồi token, dependency
│   ├── batch_job.py             # Chấm điểm hàng loạt, ghi kết quả vào DB
│   ├── config.py                # Đọc biến môi trường vào dataclass Settings
│   ├── database.py              # Tạo SQLAlchemy engine, session, helper get_db
│   ├── explain.py               # Sinh giải thích (feature importance) cho giao dịch
│   ├── model_io.py              # Nạp mô hình và artifacts (local/MLflow)
│   ├── models_auth.py           # ORM bảng auth_users & auth_tokens
│   ├── preprocess.py            # Làm sạch, encode, align dữ liệu đầu vào
│   └── scoring.py               # Tính điểm/gán quyết định dựa trên mô hình
├── artifacts/                   # Lưu artifact (encoder, schema, threshold) đang dùng
├── data/
│   ├── fraud_seqs.csv           # Danh sách seq gian lận dùng cho script fetch
│   └── sql.py                   # Câu SQL lấy dữ liệu huấn luyện (nonfraud/fraud)
├── migrations/
│   ├── 001_create_fraud_tables.sql  # Tạo bảng fraud_scores & fraud_explanations
│   └── 002_create_auth_tables.sql   # Tạo bảng auth_users & auth_tokens
├── models/                      # Thư mục chứa mô hình đã export 
├── scripts/
│   ├── fetch_window.py          # Lấy dữ liệu theo cửa sổ thời gian để huấn luyện
│   ├── retrain_rolling_mlflow.py# Rolling retrain và auto-promote mô hình
│   └── train_and_export_mlflow.py # Huấn luyện và log mô hình lên MLflow
├── utils/
│   └── common.py                # Hàm tiện ích dùng chung
├── README.md                    
├── docker-compose.yml           
├── requirements.txt             
└── tomtat.md                    
```
