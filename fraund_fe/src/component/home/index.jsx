import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Col,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  ThunderboltOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { fraudService } from "../../services/fraudService";
import {
  formatScore,
  mapReasons,
  normalizeTransactionPayload,
  resolveDecision,
  toLocalDateTimeInput,
} from "../../utils/transactionUtils";

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const DEFAULT_TRANSACTION = {
  transaction_seq: 20240001,
  user_seq: 150001,
  deposit_amount: 1250.5,
  receiving_country: "VN",
  country_code: "VN",
  payment_method: "BankTransfer",
  create_dt: toLocalDateTimeInput(),
};

const SAMPLE_TRANSACTION = {
  transaction_seq: 9876543,
  user_seq: 220045,
  deposit_amount: 3185.75,
  receiving_country: "SG",
  country_code: "SG",
  id_type: "Passport",
  stay_qualify: "Resident",
  visa_expire_date: "2025-12-31",
  user_name: "LE THANH NHAN",
  sender_name: "LE THANH",
  recipient_name: "TRAN THI HOA",
  autodebit_account: "1234567890",
  invite_code: "INV123",
  payment_method: "Card",
  create_dt: "2024-06-15T10:30",
  register_date: "2023-08-12",
  first_transaction_date: "2023-08-13",
  birth_date: "1990-02-05",
  recheck_date: "2024-05-01",
  face_pin_date: "2024-06-01",
  transaction_count_24hour: 2,
  transaction_amount_24hour: 4200.5,
  transaction_count_1week: 6,
  transaction_amount_1week: 11850.75,
  transaction_count_1month: 18,
  transaction_amount_1month: 34890.4,
};

const Home = () => {
  const [form] = Form.useForm();
  const { token } = useSelector((state) => state.auth);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reasons = useMemo(
    () => mapReasons(result?.reasons || []),
    [result?.reasons]
  );

  const recentHistory = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        decisionMeta: resolveDecision(item.decision),
        formattedScore: formatScore(item.score),
      })),
    [history]
  );

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const payload = normalizeTransactionPayload(values);
      const response = await fraudService.scoreTransaction(payload);
      if (response) {
        const record = {
          ...response,
          payload,
          timestamp: new Date().toISOString(),
        };
        setResult(response);
        setHistory((prev) => [record, ...prev].slice(0, 5));
      }
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Không thể chấm điểm giao dịch. Vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    form.setFieldsValue({
      ...SAMPLE_TRANSACTION,
    });
  };

  const handleReset = () => {
    form.resetFields();
    setResult(null);
    setError(null);
  };

  const decisionMeta = useMemo(
    () => resolveDecision(result?.decision),
    [result]
  );
  const formattedScore = useMemo(
    () => formatScore(result?.score),
    [result?.score]
  );

  const mergedResultDetails = useMemo(() => {
    if (!result) {
      return [];
    }
    const payloadSource = history.find(
      (item) => item.transaction_seq === result.transaction_seq
    )?.payload;
    const combined = {
      ...(payloadSource || {}),
      ...(result.raw || {}),
      ...result,
    };
    return [
      { label: "Mã người dùng", value: combined.user_seq },
      { label: "Quốc gia nhận", value: combined.receiving_country },
      { label: "Mã quốc gia", value: combined.country_code },
      { label: "Loại giấy tờ", value: combined.id_type },
      { label: "Stay qualify", value: combined.stay_qualify },
      { label: "Ngày hết hạn visa", value: combined.visa_expire_date },
      { label: "Tên tài khoản", value: combined.user_name },
      { label: "Người gửi", value: combined.sender_name },
      { label: "Người nhận", value: combined.recipient_name },
      { label: "Autodebit", value: combined.autodebit_account },
      { label: "Invite code", value: combined.invite_code },
      { label: "Ngày đăng ký", value: combined.register_date },
      { label: "Giao dịch đầu tiên", value: combined.first_transaction_date },
      { label: "Ngày sinh", value: combined.birth_date },
      { label: "Ngày tái thẩm định", value: combined.recheck_date },
      { label: "Ngày face pin", value: combined.face_pin_date },
      {
        label: "Số giao dịch 24h",
        value: combined.transaction_count_24hour,
      },
      {
        label: "Tổng tiền 24h",
        value: combined.transaction_amount_24hour,
      },
      {
        label: "Số giao dịch 1 tuần",
        value: combined.transaction_count_1week,
      },
      {
        label: "Tổng tiền 1 tuần",
        value: combined.transaction_amount_1week,
      },
      {
        label: "Số giao dịch 1 tháng",
        value: combined.transaction_count_1month,
      },
      {
        label: "Tổng tiền 1 tháng",
        value: combined.transaction_amount_1month,
      },
    ].filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  }, [result, history]);

  return (
    <div className="p-6">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Space direction="vertical" size="large" className="w-full">
            <Card>
              <Space direction="vertical" size="small" className="w-full">
                <Title level={3} className="!mb-0 flex items-center gap-2">
                  <ThunderboltOutlined />
                  Chấm điểm giao dịch tức thời
                </Title>
                <Paragraph className="!mb-0">
                  Điền thông tin giao dịch cần đánh giá. Hệ thống sẽ sử dụng mô
                  hình hiện hành để tính điểm rủi ro và đưa ra quyết định.
                </Paragraph>
              </Space>
            </Card>

            <Card title="Thông tin giao dịch">
              {!token && (
                <Alert
                  className="mb-4"
                  type="warning"
                  showIcon
                  message="Bạn cần đăng nhập để chấm điểm giao dịch."
                  description="Hãy đăng nhập bằng tài khoản đã được cấp quyền để truy cập API."
                />
              )}

              {error && (
                <Alert
                  className="mb-4"
                  type="error"
                  showIcon
                  message="Không thể chấm điểm giao dịch"
                  description={error}
                />
              )}

              <Form
                form={form}
                layout="vertical"
                initialValues={DEFAULT_TRANSACTION}
                onFinish={handleSubmit}
                disabled={!token}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Mã giao dịch"
                      name="transaction_seq"
                      rules={[
                        { required: true, message: "Vui lòng nhập mã giao dịch" },
                      ]}
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="Ví dụ: 9876543"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Mã người dùng" name="user_seq">
                      <InputNumber className="w-full" min={0} placeholder="Ví dụ: 150001" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Số tiền nạp"
                      name="deposit_amount"
                      rules={[
                        { required: true, message: "Vui lòng nhập số tiền nạp" },
                      ]}
                    >
                      <InputNumber
                        className="w-full"
                        min={0}
                        step={0.01}
                        placeholder="Ví dụ: 1250.5"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Quốc gia nhận"
                      name="receiving_country"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập quốc gia nhận",
                        },
                      ]}
                    >
                      <Input placeholder="Ví dụ: VN" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Mã quốc gia" name="country_code">
                      <Input placeholder="Ví dụ: VN" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Phương thức thanh toán"
                      name="payment_method"
                    >
                      <Input placeholder="Card, BankTransfer, ..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Thời điểm tạo giao dịch"
                      name="create_dt"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn thời điểm giao dịch",
                        },
                      ]}
                    >
                      <Input type="datetime-local" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Ngày hết hạn visa" name="visa_expire_date">
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider className="!my-4" />

                <Collapse ghost>
                  <Panel
                    header="Trường bổ sung (tùy chọn)"
                    key="advanced"
                    extra={<InfoCircleOutlined />}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Loại giấy tờ" name="id_type">
                          <Input placeholder="Passport, ID, ..." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Stay qualify" name="stay_qualify">
                          <Input placeholder="Resident / Non-resident" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Tên tài khoản" name="user_name">
                          <Input placeholder="Tên tài khoản" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Người gửi" name="sender_name">
                          <Input placeholder="Tên người gửi" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Người nhận" name="recipient_name">
                          <Input placeholder="Tên người nhận" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Autodebit account"
                          name="autodebit_account"
                        >
                          <Input placeholder="Số tài khoản autodebit" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Ngày đăng ký" name="register_date">
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Giao dịch đầu tiên"
                          name="first_transaction_date"
                        >
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Mã mời" name="invite_code">
                          <Input placeholder="Invite code" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Ngày sinh" name="birth_date">
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Ngày tái thẩm định" name="recheck_date">
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Ngày xác thực khuôn mặt" name="face_pin_date">
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Số giao dịch 24h"
                          name="transaction_count_24hour"
                        >
                          <InputNumber className="w-full" min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Tổng tiền 24h"
                          name="transaction_amount_24hour"
                        >
                          <InputNumber className="w-full" min={0} step={0.01} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Số giao dịch 1 tuần"
                          name="transaction_count_1week"
                        >
                          <InputNumber className="w-full" min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Tổng tiền 1 tuần"
                          name="transaction_amount_1week"
                        >
                          <InputNumber className="w-full" min={0} step={0.01} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Số giao dịch 1 tháng"
                          name="transaction_count_1month"
                        >
                          <InputNumber className="w-full" min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Tổng tiền 1 tháng"
                          name="transaction_amount_1month"
                        >
                          <InputNumber className="w-full" min={0} step={0.01} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>

                <Divider className="!my-4" />

                <Space size="middle">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<ThunderboltOutlined />}
                  >
                    Chấm điểm
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Xóa dữ liệu
                  </Button>
                  <Button onClick={handleUseSample} disabled={loading}>
                    Sử dụng dữ liệu mẫu
                  </Button>
                </Space>
              </Form>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={10}>
          <Space direction="vertical" size="large" className="w-full">
            <Card
              title="Kết quả gần nhất"
              extra={
                result ? (
                  <Tag color={decisionMeta.color}>{decisionMeta.label}</Tag>
                ) : null
              }
            >
              {result ? (
                <Space direction="vertical" size="middle" className="w-full">
                  <Statistic
                    title="Điểm gian lận"
                    value={formattedScore ? Number(formattedScore) : 0}
                    suffix="%"
                    precision={2}
                  />
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="Ngưỡng cảnh báo"
                        value={result.threshold_low}
                        precision={3}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Ngưỡng từ chối"
                        value={result.threshold_high}
                        precision={3}
                      />
                    </Col>
                  </Row>
                  <Space direction="vertical" size="small">
                    <Text>
                      <Text strong>Mã giao dịch:</Text> #{result.transaction_seq}
                    </Text>
                    {result.model_version && (
                      <Text type="secondary">
                        Phiên bản mô hình: {result.model_version}
                      </Text>
                    )}
                    {result.registry_version && (
                      <Text type="secondary">
                        Registry version: {result.registry_version}
                      </Text>
                    )}
                  </Space>

                  {mergedResultDetails.length > 0 && (
                    <Descriptions bordered size="small" column={1} className="w-full">
                      {mergedResultDetails.map((item) => (
                        <Descriptions.Item key={item.label} label={item.label}>
                          {item.value}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}

                  <Divider className="!my-3" />
                  <Title level={5} className="!mb-2 flex items-center gap-2">
                    <InfoCircleOutlined />
                    Các yếu tố nổi bật
                  </Title>

                  {reasons.length > 0 ? (
                    <List
                      dataSource={reasons}
                      renderItem={(item) => (
                        <List.Item key={item.key} className="!px-0">
                          <Space direction="vertical" size={4} className="w-full">
                            <Space size="small" align="center">
                              <Text strong>{item.title}</Text>
                              {item.direction && (
                                <Tag color={item.direction.includes("↑") ? "red" : "green"}>
                                  {item.direction}
                                </Tag>
                              )}
                              {item.impact !== null && (
                                <Tag color="blue">
                                  {Number.isFinite(Number(item.impact))
                                    ? Number(item.impact).toFixed(4)
                                    : String(item.impact)}
                                </Tag>
                              )}
                            </Space>
                            {item.description && (
                              <Text type="secondary">{item.description}</Text>
                            )}
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">
                      Mô hình không cung cấp lý giải chi tiết cho giao dịch này.
                    </Text>
                  )}
                </Space>
              ) : (
                <Empty description="Chưa có kết quả chấm điểm" />
              )}
            </Card>

            <Card
              title={
                <span className="flex items-center gap-2">
                  <HistoryOutlined />
                  Lịch sử phiên làm việc (chỉ lưu tại trình duyệt)
                </span>
              }
            >
              {recentHistory.length > 0 ? (
                <List
                  dataSource={recentHistory}
                  renderItem={(item) => (
                    <List.Item key={`${item.transaction_seq}-${item.timestamp}`}>
                      <Space direction="vertical" size={2}>
                        <Space size="small">
                          <Tag color={item.decisionMeta.color}>
                            {item.decisionMeta.label}
                          </Tag>
                          <Text strong>#{item.transaction_seq}</Text>
                        </Space>
                        <Text type="secondary">
                          Điểm:{" "}
                          {item.formattedScore
                            ? `${item.formattedScore}%`
                            : "N/A"}
                        </Text>
                        <Text type="secondary">
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Chưa có lịch sử. Hãy chấm điểm giao dịch để xem lại tại đây." />
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
