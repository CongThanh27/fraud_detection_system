# Sử dụng Python 3.9 phiên bản slim làm base image để giữ dung lượng nhẹ
FROM python:3.9-slim

# Tắt việc ghi file .pyc và đảm bảo log hiển thị ngay lập tức
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Đặt thư mục làm việc mặc định cho toàn bộ tiến trình
WORKDIR /app

# Cài các thư viện hệ thống cần thiết cho psycopg2 và các gói biên dịch
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements trước để tận dụng cache khi không đổi dependency
COPY requirements.txt ./

# Cài đặt toàn bộ Python dependency của dự án
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn và tài nguyên (trừ những gì bị .dockerignore loại trừ)
COPY . .

# Mở cổng 8080 cho FastAPI (được khai báo trong config)
EXPOSE 8080

# Lệnh khởi động mặc định: chạy UVicorn phục vụ app FastAPI
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8080"]
