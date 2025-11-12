import React, { useMemo } from "react";
import { Menu, Tooltip } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ThunderboltOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const SiderMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useSelector((state) => state.auth);

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/batch")) {
      return "batch";
    }
    if (location.pathname.startsWith("/admin")) {
      return "admin";
    }
    return "score";
  }, [location.pathname]);

  const items = useMemo(
    () => [
      {
        key: "score",
        icon: <ThunderboltOutlined />,
        label: "Chấm điểm giao dịch",
      },
      {
        key: "batch",
        icon: <DatabaseOutlined />,
        label: (
          <Tooltip
            title={!token ? "Đăng nhập để chấm điểm lô giao dịch" : null}
            placement="right"
          >
            <span>Chấm điểm theo lô</span>
          </Tooltip>
        ),
        disabled: !token,
      },
      {
        key: "admin",
        icon: <SettingOutlined />,
        label: (
          <Tooltip
            title={!token ? "Đăng nhập để truy cập quản trị mô hình" : null}
            placement="right"
          >
            <span>Quản lý mô hình</span>
          </Tooltip>
        ),
        disabled: !token,
      },
    ],
    [token]
  );

  const handleClick = ({ key }) => {
    if (key === "batch") {
      navigate("/batch");
      return;
    }
    if (key === "admin") {
      navigate("/admin");
      return;
    }
    navigate("/");
  };

  return (
    <Menu
      className="!w-full"
      mode="inline"
      items={items}
      onClick={handleClick}
      selectedKeys={[selectedKey]}
    />
  );
};

export default SiderMenu;
