import React, { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authService } from "../../services/authService";
import { fetchProfile, setAuthError, setCredentials } from "../../features/authSlice";

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(
    () => location.state?.from?.pathname || "/",
    [location.state]
  );

  const presetUsername = useMemo(() => {
    const fromState =
      location.state?.registeredUsername ||
      location.state?.username ||
      location.state?.email;
    return fromState || "";
  }, [location.state]);

  const handleFinish = async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        username: values.username.trim(),
        password: values.password,
      };
      const result = await authService.login(payload);
      if (!result || !result.token) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại.");
        return;
      }
      dispatch(
        setCredentials({
          token: result.token,
          user: result.user || null,
        })
      );
      dispatch(setAuthError(null));
      if (!result.user) {
        dispatch(fetchProfile());
      }
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Đăng nhập không thành công. Vui lòng thử lại.";
      setError(message);
      dispatch(setAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <Title level={2} className="!mb-0">
            Đăng nhập
          </Title>
          <Text type="secondary">
            Sử dụng tài khoản để truy cập hệ thống chấm điểm gian lận thời gian thực.
          </Text>
        </div>

        {error && (
          <Alert
            type="error"
            message="Đăng nhập thất bại"
            description={error}
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            username: presetUsername,
          }}
          requiredMark={false}
        >
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập" },
              {
                min: 3,
                message: "Tên đăng nhập phải có ít nhất 3 ký tự",
              },
            ]}
          >
            <Input placeholder="Nhập tên đăng nhập" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item className="!mb-2">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text type="secondary">Chưa có tài khoản? </Text>
          <Link to="/register">Đăng ký ngay</Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
