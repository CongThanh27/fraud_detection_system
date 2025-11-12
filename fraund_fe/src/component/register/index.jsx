import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authService } from "../../services/authService";
import { fetchProfile, setCredentials } from "../../features/authSlice";

const { Title, Text } = Typography;

const Register = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setError(null);
    setSubmitting(true);

    const payload = {
      username: values.username.trim(),
      password: values.password,
    };

    try {
      const result = await authService.registerAccount(payload);

      if (result?.token) {
        dispatch(
          setCredentials({
            token: result.token,
            user: result.user || { username: payload.username },
          })
        );
        if (!result.user) {
          await dispatch(fetchProfile());
        }
        navigate("/", { replace: true });
        return;
      }

      navigate("/login", {
        replace: true,
        state: { registeredUsername: payload.username },
      });
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Đăng ký không thành công. Vui lòng thử lại.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <div className="text-center mb-6">
          <Title level={2} className="!mb-0">
            Tạo tài khoản
          </Title>
          <Text type="secondary">
            Đăng ký để truy cập bảng điều khiển chấm điểm gian lận.
          </Text>
        </div>

        {error && (
          <Alert
            type="error"
            message="Đăng ký thất bại"
            description={error}
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập" },
              { min: 3, message: "Tên đăng nhập tối thiểu 3 ký tự" },
              {
                pattern: /^[A-Za-z0-9_\-.@]+$/,
                message: "Tên đăng nhập chỉ chứa chữ, số và _ . - @",
              },
            ]}
          >
            <Input placeholder="fraud_analyst" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 8, message: "Mật khẩu tối thiểu 8 ký tự" },
            ]}
            hasFeedback
          >
            <Input.Password
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp")
                  );
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu" />
          </Form.Item>

          <Form.Item className="!mb-2">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              Đăng ký
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text type="secondary">Đã có tài khoản? </Text>
          <Link to="/login">Đăng nhập</Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
