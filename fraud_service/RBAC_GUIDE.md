# Role-Based Access Control (RBAC) Guide

## Tổng Quan

Hệ thống Fraud Scoring Service hiện hỗ trợ 2 loại vai trò:

### 1. **Role: `user`** (Mặc định)
Người dùng thường chỉ có thể:
- ✅ Đăng nhập/Đăng xuất
- ✅ Chấm điểm **1 giao dịch** tại một thời điểm (`/score`)
- ✅ Xem sức khỏe dịch vụ (`/health`)

### 2. **Role: `admin`** (Quản trị viên)
Admin có thể thực hiện mọi tác vụ:
- ✅ Đăng nhập/Đăng xuất
- ✅ Chấm điểm 1 giao dịch (`/score`)
- ✅ Chấm điểm **hàng loạt** (`/score/batch`)
- ✅ Tải lên file CSV chấm điểm (`/score/upload`)
- ✅ Tải lại model và artifacts (`/reload`)
- ✅ Xem sức khỏe dịch vụ (`/health`)

---

## Quản Lý Người Dùng

### Tạo Người Dùng Mới

**Option 1: Sử dụng script `manage_roles.py`**

```bash
# Tạo user mới (mặc định là role 'user')
python -m scripts.manage_roles create_user john_doe secure_password123

# Tạo user mới với role 'admin'
python -m scripts.manage_roles create_user admin_user secure_password123 --role admin
```

**Option 2: Sử dụng API endpoint `/auth/register`**

```bash
curl -X POST "http://localhost:8080/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "password": "secure_password123"
  }'
```

**⚠️ Lưu ý:** Endpoint `/auth/register` mặc định tạo người dùng với role `user`. Để tạo admin, cần sử dụng script hoặc cập nhật database trực tiếp.

### Thay Đổi Vai Trò Người Dùng

```bash
# Cập nhật role của người dùng từ 'user' thành 'admin'
python -m scripts.manage_roles set_role john_doe admin

# Cập nhật role từ 'admin' về 'user'
python -m scripts.manage_roles set_role admin_user user
```

### Liệt Kê Tất Cả Người Dùng

```bash
python -m scripts.manage_roles list_users
```

---

## Các Endpoint và Yêu Cầu Quyền Hạn

| Endpoint | Phương Thức | Yêu Cầu Auth | Role Yêu Cầu | Mô Tả |
|----------|------------|-------------|-------------|-------|
| `/auth/login` | POST | ❌ | - | Đăng nhập, nhận JWT token |
| `/auth/logout` | POST | ✅ | `user`, `admin` | Đăng xuất, thu hồi token |
| `/auth/register` | POST | ❌ | - | Đăng ký tài khoản mới (role mặc định: `user`) |
| `/health` | GET | ❌ | - | Kiểm tra sức khỏe dịch vụ |
| `/score` | POST | ✅ | `user`, `admin` | Chấm điểm 1 giao dịch |
| `/score/batch` | POST | ✅ | `admin` | Chấm điểm hàng loạt |
| `/score/upload` | POST | ✅ | `admin` | Tải CSV và chấm điểm |
| `/reload` | POST | ✅ | `admin` | Tải lại model từ disk/MLflow |

---

## Ví Dụ Sử Dụng

### 1. Đăng Nhập

```bash
curl -X POST "http://localhost:8080/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john_doe&password=secure_password123"

# Response:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer",
#   "expires_in": 3600,
#   "username": "john_doe"
# }
```

### 2. User Chấm Điểm 1 Giao Dịch (Allowed)

```bash
curl -X POST "http://localhost:8080/score" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_seq": 12345,
    "deposit_amount": 1000.50,
    "receiving_country": "VN",
    "create_dt": "2024-01-15"
  }'

# ✅ Thành công - User có quyền truy cập /score
```

### 3. User Cố Gắng Chấm Điểm Hàng Loạt (Forbidden)

```bash
curl -X POST "http://localhost:8080/score/batch" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [...]
  }'

# ❌ HTTP 403 Forbidden
# {
#   "detail": "This action requires admin privileges."
# }
```

### 4. Admin Chấm Điểm Hàng Loạt (Allowed)

```bash
curl -X POST "http://localhost:8080/score/batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [...]
  }'

# ✅ Thành công - Admin có quyền truy cập /score/batch
```

---

## Cấu Trúc Database

### Bảng `auth_users`

```sql
CREATE TABLE auth_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',  -- NEW
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để tối ưu tìm kiếm
CREATE INDEX idx_auth_users_role ON auth_users (role);
```

---

## Truy Cập Trực Tiếp Database

Nếu cần quản lý vai trò trực tiếp qua SQL:

```sql
-- Xem tất cả người dùng và role
SELECT id, username, role, is_active FROM auth_users ORDER BY id;

-- Cập nhật role của 1 người dùng
UPDATE auth_users SET role = 'admin' WHERE username = 'john_doe';

-- Vô hiệu hóa tài khoản
UPDATE auth_users SET is_active = FALSE WHERE username = 'user123';
```

---

## Lưu Ý Bảo Mật

1. **JWT Token**: Token có thời hạn và được xác minh qua cơ sở dữ liệu
2. **Role Check**: Mỗi endpoint yêu cầu quyền sẽ kiểm tra role từ user record trong DB
3. **Password**: Mất khẩu được hash bằng bcrypt, không lưu plaintext
4. **Token Revocation**: Logout sẽ đánh dấu token là revoked trong DB

---

## Troubleshooting

**Q: Tôi đã tạo user nhưng không thể truy cập `/score/batch`**
A: Kiểm tra xem user có role `admin` không. Mặc định, user mới có role `user`.

**Q: Script `manage_roles.py` báo lỗi import**
A: Đảm bảo bạn chạy từ thư mục gốc dự án: `python -m scripts.manage_roles`

**Q: Cột `role` không tồn tại trong bảng**
A: Chạy migration SQL: `psql -U your_user -d your_db -f migrations/003_add_role_to_auth_users.sql`

