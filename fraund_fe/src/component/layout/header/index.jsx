import React, { useMemo } from "react";
import { Button, Dropdown, Space, Typography } from "antd";
import {
  AreaChartOutlined,
  HistoryOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../images/app_logo_name.png";
import { clearCredentials } from "../../../features/authSlice";
import { authService } from "../../../services/authService";

const { Text } = Typography;

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const displayName = useMemo(() => {
    if (!user) return null;
    return (
      user.username ||
      user.fullName ||
      user.name ||
      user.email ||
      user.id ||
      "Tài khoản"
    );
  }, [user]);

  const userMenu = useMemo(
    () => [
      {
        key: "batch",
        icon: <HistoryOutlined />,
        label: <Link to="/batch">Chấm điểm theo lô</Link>,
      },
      {
        key: "admin",
        icon: <AreaChartOutlined />,
        label: <Link to="/admin">Quản lý mô hình</Link>,
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
      },
    ],
    []
  );

  const handleMenuClick = async ({ key }) => {
    if (key === "logout") {
      try {
        await authService.logout();
      } catch (error) {
        console.warn("Logout error:", error);
      } finally {
        dispatch(clearCredentials());
        navigate("/login");
      }
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 focus:outline-none"
          >
            <img
              src={logo}
              alt="Fake News Shield"
              className="h-10 w-auto object-contain"
            />
            <div className="text-left">
              <Text strong className="!text-base md:!text-lg">
                {/* FinShot Protect */}
              </Text>
              {/* <div className="text-xs text-gray-500 hidden sm:block">
                Bảng điều khiển chấm điểm giao dịch gian lận theo thời gian thực
              </div> */}
            </div>
          </button>

          <Space size="middle">
            {token ? (
              <Dropdown
                menu={{
                  items: userMenu,
                  onClick: handleMenuClick,
                }}
                trigger={["click"]}
              >
                <Button type="text" icon={<UserOutlined />}>
                  {displayName || "Tài khoản"}
                </Button>
              </Dropdown>
            ) : (
              <>
                <Button
                  icon={<LoginOutlined />}
                  onClick={() => navigate("/login")}
                >
                  Đăng nhập
                </Button>
                <Button
                  type="primary"
                  onClick={() => navigate("/register")}
                >
                  Đăng ký
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>
    </header>
  );
};

export default Header;
