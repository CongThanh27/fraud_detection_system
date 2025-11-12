import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  CloudSyncOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { fraudService } from "../../services/fraudService";

const { Paragraph, Text } = Typography;

const ENDPOINT_GUIDE = [
  {
    path: "POST /score",
    description:
      "Chấm điểm một giao dịch duy nhất. Yêu cầu Bearer token và payload theo schema Tx.",
  },
  {
    path: "POST /score/batch",
    description:
      "Chấm điểm danh sách giao dịch ở dạng JSON. Thích hợp cho tích hợp back-office.",
  },
  {
    path: "POST /score/upload",
    description:
      "Nhận file CSV chứa danh sách giao dịch. API sẽ trả về bảng điểm và lý giải.",
    extraHref:
      "http://my-mlflow-eastasia-thanh-ctn.hjfkc0gkb2ghbvfe.koreacentral.azurecontainer.io:5000/",
    extraLabel: "MLflow Tracking UI",
  },
  {
    path: "POST /reload",
    description:
      "Tải lại mô hình và artifact trên máy chủ. Chỉ sử dụng khi vừa huấn luyện lại.",
  },
  {
    path: "GET /health",
    description:
      "Kiểm tra trạng thái dịch vụ, phiên bản mô hình và bí danh đang hoạt động.",
    public: true,
  },
];

const SchedulerNotes = [
  {
    title: "Batch job",
    description:
      "Chạy tự động mỗi 1 phút (được cấu hình trong API) để xử lý các giao dịch cần quét hàng loạt.",
  },
  {
    title: "Retrain job",
    description:
      "Chạy mỗi 5 phút. Khi hoàn tất sẽ tải lại mô hình mới nhất. Có thể bắt đầu lâu hơn tùy dữ liệu.",
  },
  {
    title: "Gợi ý",
    description:
      "Nếu cần tắt job định kỳ, chỉnh sửa lịch trong app/api.py hoặc vô hiệu hóa Scheduler ở startup.",
  },
];

const Statistics = () => {
  const { token } = useSelector((state) => state.auth);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloading, setReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fraudService.fetchHealth();
      setHealth(payload);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải trạng thái dịch vụ.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const statusTag = useMemo(() => {
    const status = (health?.status || "").toString().toLowerCase();
    if (status === "ok" || status === "healthy") {
      return (
        <Tag icon={<CheckCircleOutlined />} color="green">
          Hoạt động ổn định
        </Tag>
      );
    }
    if (status) {
      return (
        <Tag icon={<WarningOutlined />} color="gold">
          {health.status}
        </Tag>
      );
    }
    return (
      <Tag icon={<InfoCircleOutlined />} color="default">
        Chưa xác định
      </Tag>
    );
  }, [health]);

  const handleReloadModel = async () => {
    if (!token) {
      setReloadStatus({
        type: "warning",
        message: "Bạn cần đăng nhập để reload mô hình.",
      });
      return;
    }
    setReloading(true);
    setReloadStatus(null);
    try {
      const response = await fraudService.reloadModel();
      setReloadStatus({
        type: "success",
        message:
          response?.model_version
            ? `Đã tải lại mô hình phiên bản ${response.model_version}.`
            : "Đã tải lại mô hình thành công.",
      });
      await fetchHealth();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải lại mô hình.";
      setReloadStatus({ type: "error", message });
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        <Card>
          <Space direction="vertical" size="middle" className="w-full">
            <Text strong>Mục đích Cốt lõi</Text>
            <Paragraph className="!mb-0">
              Quản lý Rủi ro Giao dịch Tự động cho ứng dụng chuyển tiền quốc tế CoinShot.
              FinShot Protect phát hiện và phân loại giao dịch gian lận theo thời gian thực
              hoặc theo lô, đảm bảo quy tắc rủi ro luôn cập nhật trước hành vi tội phạm.
            </Paragraph>

            <Divider className="!my-3" />

            <Text strong>1. Dịch vụ Chấm điểm Tốc độ cao</Text>
            <Paragraph className="!mb-0">
              Cung cấp API <code>/score</code>, <code>/score/batch</code> để trả về quyết định ALLOW,
              REVIEW hoặc BLOCK ngay lập tức. Kiến trúc FastAPI async giúp giữ độ trễ thấp.
            </Paragraph>

            <Text strong>2. Đảm bảo Tính nhất quán của Dữ liệu</Text>
            <Paragraph className="!mb-0">
              Tận dụng các artifacts như <code>medians</code>, <code>encoders</code>, <code>clipping_bounds</code>
              để tiền xử lý bản ghi inference giống dữ liệu huấn luyện, ngăn rò rỉ dữ liệu.
            </Paragraph>

            <Text strong>3. Phản hồi Học tập liên tục</Text>
            <Paragraph className="!mb-0">
              Job <code>retrain_rolling_mlflow</code> tự động huấn luyện lại theo lịch, sử dụng OOT split
              để chống concept drift và chỉ quảng bá mô hình tốt nhất sau khi so sánh trong MLflow.
            </Paragraph>

            <Text strong>Các chức năng phụ trợ</Text>
            <Paragraph className="!mb-0">
              - <strong>Quản lý mô hình tập trung:</strong> MLflow Registry theo dõi phiên bản, so sánh hiệu suất
              và quảng bá alias "Production" khi model chiến thắng.<br />
              - <strong>Giải thích:</strong> <code>score_decide_with_explanations</code> trả về lý do giúp reviewer hiểu quyết định.<br />
              - <strong>Bảo mật API:</strong> JWT/OAuth2 bảo vệ các endpoint <code>/auth</code> và dịch vụ chấm điểm.
            </Paragraph>
          </Space>
        </Card>

        <Card>
          <Space direction="vertical" size="middle" className="w-full">
            <Space align="center" className="justify-between w-full">
              <Text strong className="flex items-center gap-2 text-lg">
                <CloudSyncOutlined />
                Trạng thái dịch vụ và mô hình
              </Text>
              <Space>
                <Button
                  type="link"
                  href="http://my-mlflow-eastasia-thanh-ctn.hjfkc0gkb2ghbvfe.koreacentral.azurecontainer.io:5000/"
                  target="_blank"
                  rel="noreferrer"
                >
                  MLflow Tracking UI
                </Button>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={fetchHealth}
                >
                  Làm mới
                </Button>
              </Space>
            </Space>

            <Paragraph className="!mb-0">
              Theo dõi phiên bản mô hình, alias MLflow và trạng thái hoạt động
              của API. Bạn có thể chủ động reload để áp dụng mô hình mới nhất
              sau khi huấn luyện.
            </Paragraph>

            {error && (
              <Alert
                type="error"
                message="Không thể tải trạng thái"
                description={error}
                showIcon
              />
            )}

            {health && (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="Trạng thái">
                  {statusTag}
                </Descriptions.Item>
                <Descriptions.Item label="Model version">
                  {health.model_version || "Không có thông tin"}
                </Descriptions.Item>
                <Descriptions.Item label="Registry version">
                  {health.registry_version || "Không có thông tin"}
                </Descriptions.Item>
                <Descriptions.Item label="Alias">
                  {health.alias || "(none)"}
                </Descriptions.Item>
              </Descriptions>
            )}

            <Space>
              <Button
                type="primary"
                icon={<CloudSyncOutlined />}
                onClick={handleReloadModel}
                loading={reloading}
                disabled={!token}
              >
                Reload mô hình
              </Button>
              {!token && (
                <Text type="secondary">
                  Đăng nhập để thực hiện reload hoặc các tác vụ bảo trì.
                </Text>
              )}
            </Space>

            {reloadStatus && (
              <Alert
                type={reloadStatus.type}
                message={reloadStatus.message}
                showIcon
              />
            )}
          </Space>
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Thông số quan trọng"> 
              <Space direction="vertical" size="large" className="w-full">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Ngưỡng cảnh báo"
                      value={health?.threshold_low ?? "--"}
                      precision={health?.threshold_low ? 3 : undefined}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Ngưỡng từ chối"
                      value={health?.threshold_high ?? "--"}
                      precision={health?.threshold_high ? 3 : undefined}
                    />
                  </Col>
                </Row>
                <Paragraph type="secondary" className="!mb-0">
                  Ngưỡng lấy từ file cấu hình của mô hình khi khởi chạy. Nếu vừa
                  huấn luyện lại, hãy đảm bảo ngưỡng đã được cập nhật trong file
                  artifacts hoặc MLflow.
                </Paragraph>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Lịch trình tác vụ tự động">
              <List
                itemLayout="vertical"
                dataSource={SchedulerNotes}
                renderItem={(item) => (
                  <List.Item key={item.title}>
                    <List.Item.Meta
                      title={<Text strong>{item.title}</Text>}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Tài liệu nhanh cho API">
          <List
            dataSource={ENDPOINT_GUIDE}
            renderItem={(item) => (
              <List.Item key={item.path}>
                <Space direction="vertical" size={4}>
                  <Text strong>
                    {item.path}
                    {!item.public && (
                      <Tag color="red" className="ml-2">
                        Yêu cầu auth
                      </Tag>
                    )}
                    {item.public && (
                      <Tag color="green" className="ml-2">
                        Public
                      </Tag>
                    )}
                  </Text>
                  <Text type="secondary">
                    {item.description}
                    {item.extraHref && (
                      <>
                        <br />
                        <a href={item.extraHref} target="_blank" rel="noreferrer">
                          {item.extraLabel || item.extraHref}
                        </a>
                      </>
                    )}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
          <Divider className="!my-4" />
          <Paragraph type="secondary" className="!mb-0">
            Đối với tích hợp mới, hãy ưu tiên sử dụng <code>/score</code> hoặc
            <code>/score/batch</code>. File upload hữu ích cho vận hành thủ
            công, trong khi job định kỳ sẽ phụ trách xử lý hàng loạt.
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
};

export default Statistics;
