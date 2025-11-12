import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Spin } from "antd";

const RequireAuth = ({ children }) => {
  const token = useSelector((state) => state.auth.token);
  const status = useSelector((state) => state.auth.status);
  const location = useLocation();

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

  return children;
};

export default RequireAuth;

