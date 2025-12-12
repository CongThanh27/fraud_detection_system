import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spin, Result } from "antd";

const RequireRoleAuth = ({ children, allowedRoles = ["user", "admin"] }) => {
  const token = useSelector((state) => state.auth.token);
  const status = useSelector((state) => state.auth.status);
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!token && status !== "loading") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center py-10">
        <Spin tip="Đang tải thông tin tài khoản..." />
      </div>
    );
  }

  // Check if user has required role
  const userRole = user?.role || "user";
  if (!allowedRoles.includes(userRole)) {
    return (
      <Result
        status="403"
        title="Truy cập bị từ chối"
        subTitle={`Bạn không có quyền truy cập trang này. Bạn cần role: ${allowedRoles.join(", ")}`}
      />
    );
  }

  return children;
};

export default RequireRoleAuth;
