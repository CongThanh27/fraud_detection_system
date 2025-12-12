-- migrations/003_add_role_to_auth_users.sql
-- Thêm cột role để phân quyền người dùng (admin hoặc user)
-- Nếu cột đã tồn tại, câu lệnh sẽ bỏ qua

ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Tạo index để tối ưu tìm kiếm theo role
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users (role);

-- Cập nhật giá trị role cho các user hiện tại (nếu muốn, có thể thay đổi logic này)
-- UPDATE auth_users SET role = 'user' WHERE role IS NULL;
