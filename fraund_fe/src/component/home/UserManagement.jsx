import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Select,
  Switch,
  Spin,
  Alert,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Empty,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { userManagementService } from "../../services/userManagementService";
import { handelException } from "../../services/handelException";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRole, setNewRole] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    userCount: 0,
    activeCount: 0,
  });

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementService.getAllUsers();
      setUsers(data || []);

      // Calculate stats
      const adminCount = data?.filter((u) => u.role === "admin").length || 0;
      const userCount = data?.filter((u) => u.role === "user").length || 0;
      const activeCount = data?.filter((u) => u.is_active).length || 0;

      setStats({
        totalUsers: data?.length || 0,
        adminCount,
        userCount,
        activeCount,
      });
    } catch (err) {
      setError("Không thể tải danh sách người dùng");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Handle role change
  const handleRoleChange = async (userId, role) => {
    try {
      setLoading(true);
      await userManagementService.updateUserRole(userId, role);
      handelException.handelNotificationSwal(
        `Cập nhật quyền thành công`,
        "success"
      );
      await loadUsers();
      setModalVisible(false);
      setEditingUser(null);
      setNewRole(null);
    } catch (err) {
      handelException.handelNotificationSwal(
        "Cập nhật quyền thất bại",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle user status toggle
  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setLoading(true);
      await userManagementService.toggleUserStatus(userId, !currentStatus);
      handelException.handelNotificationSwal(
        `Cập nhật trạng thái thành công`,
        "success"
      );
      await loadUsers();
    } catch (err) {
      handelException.handelNotificationSwal(
        "Cập nhật trạng thái thất bại",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Show edit modal
  const showEditModal = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
    setModalVisible(true);
  };

  // Close modal
  const handleCancel = () => {
    setModalVisible(false);
    setEditingUser(null);
    setNewRole(null);
  };

  // Table columns
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: "Quyền hạn",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "admin" ? "red" : "blue"}>{role.toUpperCase()}</Tag>
      ),
      filters: [
        { text: "Admin", value: "admin" },
        { text: "User", value: "user" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleStatusToggle(record.id, isActive)}
          disabled={loading}
        />
      ),
      filters: [
        { text: "Hoạt động", value: true },
        { text: "Vô hiệu hóa", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => (date ? new Date(date).toLocaleDateString("vi-VN") : "-"),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => showEditModal(record)}
            disabled={loading}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadUsers}
            disabled={loading}
          >
            Làm mới
          </Button>
        </div>

        {error && (
          <Alert message="Lỗi" description={error} type="error" showIcon />
        )}

        {/* Statistics */}
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng người dùng"
                value={stats.totalUsers}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Quản trị viên"
                value={stats.adminCount}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Người dùng thường"
                value={stats.userCount}
                prefix={<UserOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đang hoạt động"
                value={stats.activeCount}
                suffix={`/ ${stats.totalUsers}`}
              />
            </Card>
          </Col>
        </Row>

        {/* Users Table */}
        {users.length === 0 ? (
          <Card>
            <Empty description="Không có người dùng nào" />
          </Card>
        ) : (
          <Card>
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} người dùng`,
              }}
            />
          </Card>
        )}

        {/* Edit Role Modal */}
        <Modal
          title="Sửa quyền hạn"
          open={modalVisible}
          onOk={() => {
            if (newRole !== editingUser?.role) {
              handleRoleChange(editingUser.id, newRole);
            } else {
              setModalVisible(false);
            }
          }}
          onCancel={handleCancel}
          confirmLoading={loading}
          okText="Cập nhật"
          cancelText="Hủy"
        >
          {editingUser && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Người dùng: {editingUser.username}</p>
                <p className="text-gray-500">ID: {editingUser.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Chọn quyền hạn:
                </label>
                <Select
                  value={newRole}
                  onChange={setNewRole}
                  style={{ width: "100%" }}
                  options={[
                    {
                      label: "User (Chỉ chấm điểm 1 tx)",
                      value: "user",
                    },
                    {
                      label: "Admin (Toàn bộ chức năng)",
                      value: "admin",
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default UserManagement;
