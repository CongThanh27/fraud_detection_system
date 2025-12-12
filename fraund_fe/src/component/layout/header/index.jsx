import React, { useMemo } from "react";
import { Button, Dropdown, Space, Typography, Badge } from "antd";
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

  const userRole = useMemo(() => {
    return user?.role || "user";
  }, [user]);

  const userMenu = useMemo(() => {
    const baseItems = [];

    if (userRole === "admin") {
      baseItems.push({
        key: "batch",
        icon: <HistoryOutlined />,
        label: <Link to="/batch">Chấm điểm theo lô</Link>,
      });
    }

    if (userRole === "admin") {
      baseItems.push({
        key: "admin",
        icon: <AreaChartOutlined />,
        label: <Link to="/admin">Dashboard quản trị</Link>,
      });
    }

    baseItems.push(
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
      }
    );

    return baseItems;
  }, [userRole]);

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

  const getRoleBadgeColor = (role) => {
    return role === "admin" ? "red" : "blue";
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
                  <span>{displayName || "Tài khoản"}</span>
                  <Badge
                    count={userRole.toUpperCase()}
                    style={{
                      backgroundColor: getRoleBadgeColor(userRole),
                      fontSize: "10px",
                      height: "18px",
                      lineHeight: "18px",
                      marginLeft: "4px",
                    }}
                  />
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
