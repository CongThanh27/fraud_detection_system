import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  List,
  Menu,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined as DownloadOutlinedIcon,
  FileExcelOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { fraudService } from "../../services/fraudService";
import {
  formatScore,
  mapReasons,
  normalizeTransactions,
  resolveDecision,
  toLocalDateTimeInput,
} from "../../utils/transactionUtils";

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const CSV_TEMPLATE = `transaction_seq,user_seq,create_dt,deposit_amount,receiving_country,country_code,id_type,stay_qualify,visa_expire_date,user_name,sender_name,recipient_name,payment_method,autodebit_account,register_date,first_transaction_date,birth_date,recheck_date,invite_code,face_pin_date,transaction_count_24hour,transaction_amount_24hour,transaction_count_1week,transaction_amount_1week,transaction_count_1month,transaction_amount_1month
4000000,200001,2024-06-15 09:30:00,1250.50,VN,VN,passport,Resident,2025-12-31,LE THANH NHAN,LE THANH,TRAN THI HOA,BankTransfer,1234567890,2023-10-01,2023-10-12,1990-02-05,2024-03-01,INV123,2024-06-01,1,1250.5,2,2450.5,5,10000
4000001,200002,2024-06-15 09:35:00,4200.00,US,US,id,Resident,2026-01-10,JOHN DOE,JOHN DOE,ALAN SMITH,Card,,2022-08-14,2022-08-16,1989-11-20,2023-09-05,INV456,2024-05-10,0,0,1,4200,4,17500`;

const REQUIRED_COLUMNS = [
  "transaction_seq",
  "user_seq",
  "create_dt",
  "deposit_amount",
  "receiving_country",
  "country_code",
  "id_type",
  "stay_qualify",
  "visa_expire_date",
  "user_name",
  "sender_name",
  "recipient_name",
  "payment_method",
  "autodebit_account",
  "register_date",
  "first_transaction_date",
  "birth_date",
  "recheck_date",
  "invite_code",
  "face_pin_date",
  "transaction_count_24hour",
  "transaction_amount_24hour",
  "transaction_count_1week",
  "transaction_amount_1week",
  "transaction_count_1month",
  "transaction_amount_1month",
];

function createDefaultTransaction(index = 0) {
  return {
    transaction_seq: 4000000 + index,
    user_seq: 200000 + index,
    create_dt: toLocalDateTimeInput(),
    deposit_amount: 1000 + index * 250,
    receiving_country: index % 2 === 0 ? "VN" : "US",
    country_code: index % 2 === 0 ? "VN" : "US",
    id_type: "passport",
    stay_qualify: "Resident",
    payment_method: index % 2 === 0 ? "BankTransfer" : "Card",
  };
}

const formatErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    return error
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.msg || item?.message || JSON.stringify(item)
      )
      .join("; ");
  }

  if (typeof error === "object") {
    return (
      error.msg ||
      error.message ||
      error.detail ||
      error.error ||
      JSON.stringify(error)
    );
  }

  return fallback;
};

const reasonsRenderer = (record) => {
  const reasons = mapReasons(record.reasons || record.raw?.reasons || []);
  if (reasons.length === 0) {
    return <Text type="secondary">Không có lý giải cụ thể.</Text>;
  }
  return (
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
  );
};

const BatchScoring = () => {
  const [form] = Form.useForm();
  const { token } = useSelector((state) => state.auth);
  const [manualResult, setManualResult] = useState(null);
  const [manualSource, setManualSource] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [includeAllow, setIncludeAllow] = useState(true);
  const [topK, setTopK] = useState(3);

  const initialTransactions = useMemo(
    () => [createDefaultTransaction(0), createDefaultTransaction(1)],
    []
  );

  const manualLookup = useMemo(() => {
    const map = new Map();
    manualSource.forEach((item) => {
      if (item.transaction_seq !== undefined && item.transaction_seq !== null) {
        map.set(String(item.transaction_seq), item);
      }
    });
    return map;
  }, [manualSource]);

  const manualRows = useMemo(() => {
    const results = manualResult?.results ?? [];
    return results.map((row, index) => {
      const seq = row.transaction_seq ?? index;
      const original = manualLookup.get(String(seq)) ?? {};
      return {
        ...original,
        ...row,
        key: seq,
        transaction_seq: seq,
        deposit_amount: row.deposit_amount ?? original.deposit_amount ?? null,
        receiving_country:
          row.receiving_country ?? original.receiving_country ?? null,
        payment_method: row.payment_method ?? original.payment_method ?? null,
        country_code: row.country_code ?? original.country_code ?? null,
        decisionMeta: resolveDecision(row.decision),
        formattedScore: formatScore(row.score),
        reasons: row.reasons ?? row.raw?.reasons ?? [],
      };
    });
  }, [manualResult, manualLookup]);

  const uploadRows = useMemo(() => {
    const results = uploadResult?.results ?? [];
    return results.map((row, index) => ({
      ...row,
      key: row.transaction_seq ?? `upload-${index}`,
      decisionMeta: resolveDecision(row.decision),
      formattedScore: formatScore(row.score),
      reasons: row.reasons ?? row.raw?.reasons ?? [],
    }));
  }, [uploadResult]);

  const columns = useMemo(
    () => [
      {
        title: "Mã giao dịch",
        dataIndex: "transaction_seq",
        key: "transaction_seq",
        width: 130,
      },
      {
        title: "Quyết định",
        dataIndex: "decision",
        key: "decision",
        width: 160,
        render: (_, record) => (
          <Tag color={record.decisionMeta.color}>
            {record.decisionMeta.label}
          </Tag>
        ),
      },
      {
        title: "Điểm",
        dataIndex: "formattedScore",
        key: "formattedScore",
        width: 110,
        render: (value) => (value ? `${value}%` : "N/A"),
      },
      {
        title: "Số tiền",
        dataIndex: "deposit_amount",
        key: "deposit_amount",
        render: (value) =>
          value !== undefined && value !== null
            ? Number(value).toLocaleString("vi-VN")
            : "--",
      },
      {
        title: "Quốc gia",
        dataIndex: "receiving_country",
        key: "receiving_country",
        width: 120,
      },
      {
        title: "Phương thức",
        dataIndex: "payment_method",
        key: "payment_method",
        width: 150,
      },
      // {
      //   title: "Phiên bản mô hình",
      //   dataIndex: "model_version",
      //   key: "model_version",
      // },
    ],
    []
  );

  const expandedRowRender = (record) => {
    const detailItems = [
      { label: "Mã người dùng", value: record.user_seq },
      { label: "Mã quốc gia", value: record.country_code },
      { label: "Loại giấy tờ", value: record.id_type },
      { label: "Stay qualify", value: record.stay_qualify },
      { label: "Visa hết hạn", value: record.visa_expire_date },
      { label: "Tên tài khoản", value: record.user_name },
      { label: "Người gửi", value: record.sender_name },
      { label: "Người nhận", value: record.recipient_name },
      { label: "Autodebit", value: record.autodebit_account },
      { label: "Ngày đăng ký", value: record.register_date },
      { label: "Giao dịch đầu tiên", value: record.first_transaction_date },
      { label: "Ngày sinh", value: record.birth_date },
      { label: "Ngày tái thẩm định", value: record.recheck_date },
      { label: "Face pin", value: record.face_pin_date },
      { label: "Invite code", value: record.invite_code },
      {
        label: "Số GD 24h",
        value: record.transaction_count_24hour,
      },
      {
        label: "Tổng tiền 24h",
        value: record.transaction_amount_24hour,
      },
      {
        label: "Số GD 1 tuần",
        value: record.transaction_count_1week,
      },
      {
        label: "Tổng tiền 1 tuần",
        value: record.transaction_amount_1week,
      },
      {
        label: "Số GD 1 tháng",
        value: record.transaction_count_1month,
      },
      {
        label: "Tổng tiền 1 tháng",
        value: record.transaction_amount_1month,
      },
    ].filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

    return (
      <Space direction="vertical" size="middle" className="w-full">
        {detailItems.length > 0 && (
          <Descriptions bordered size="small" column={1} className="w-full">
            {detailItems.map((item) => (
              <Descriptions.Item key={item.label} label={item.label}>
                {item.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        <div>
          <Divider className="!my-3" />
          <Text strong>Giải thích mô hình</Text>
          {reasonsRenderer(record)}
        </div>
      </Space>
    );
  };

  const handleManualSubmit = async (values) => {
    setError(null);
    setManualResult(null);
    const transactions = normalizeTransactions(values.transactions || []);
    if (!transactions.length) {
      setError("Vui lòng nhập ít nhất một giao dịch hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      setManualSource(transactions);
      const response = await fraudService.scoreBatch({ transactions });
      setManualResult(response);
    } catch (err) {
      const fallback = "Không thể chấm điểm lô giao dịch.";
      const message = formatErrorMessage(
        err?.response?.data?.detail || err?.response?.data,
        err?.message
      );
      setError(message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setUploadError(null);
    setUploadResult(null);
    setUploading(true);
    try {
      const response = await fraudService.scoreUpload(file, {
        includeAllow,
        topK,
      });
      setUploadResult(response);
    } catch (err) {
      const fallback = "Không thể chấm điểm file CSV.";
      const message = formatErrorMessage(
        err?.response?.data?.detail || err?.response?.data,
        err?.message
      );
      setUploadError(message || fallback);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fraud_batch_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadProps = {
    name: "file",
    accept: ".csv",
    maxCount: 1,
    beforeUpload: handleUpload,
    showUploadList: false,
    disabled: !token,
  };

  const exportJson = (payload, filename) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCsv = (rows, filename) => {
    const data = Array.isArray(rows) ? rows : rows?.results ?? [];
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    const columns = Object.keys(
      data.reduce((memo, row) => Object.assign(memo, row), {})
    );
    const csv = [
      columns.join(","),
      ...data.map((row) =>
        columns
          .map((col) => {
            const value = row[col];
            if (value === undefined || value === null) {
              return "";
            }
            if (typeof value === "object") {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const manualExportMenu = (
    <Menu
      items={[
        {
          key: "json",
          icon: <DownloadOutlinedIcon />,
          label: "Tải JSON",
          onClick: () =>
            exportJson(manualResult, "batch-manual-result.json"),
        },
        {
          key: "csv",
          icon: <FileExcelOutlined />,
          label: "Tải CSV",
          onClick: () => exportCsv(manualRows, "batch-manual-result.csv"),
        },
      ]}
    />
  );

  const uploadExportMenu = (
    <Menu
      items={[
        {
          key: "json",
          icon: <DownloadOutlinedIcon />,
          label: "Tải JSON",
          onClick: () =>
            exportJson(uploadResult, "batch-upload-result.json"),
        },
        {
          key: "csv",
          icon: <FileExcelOutlined />,
          label: "Tải CSV",
          onClick: () => exportCsv(uploadRows, "batch-upload-result.csv"),
        },
      ]}
    />
  );

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        <Card>
          <Space direction="vertical" size="small" className="w-full">
            <Title level={3} className="!mb-0 flex items-center gap-2">
              <FileTextOutlined />
              Chấm điểm giao dịch theo lô
            </Title>
            <Paragraph className="!mb-0">
              Chuẩn bị dữ liệu có cùng cấu trúc với file <code>data/is_fraud.csv</code>.
              Bạn có thể nhập tối đa 10 bản ghi thủ công hoặc tải lên file CSV lớn
              hơn để xử lý hàng loạt.
            </Paragraph>
          </Space>
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={14}>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <PlayCircleOutlined />
                  Nhập nhanh tối đa 10 giao dịch
                </span>
              }
            >
              {!token && (
                <Alert
                  className="mb-4"
                  type="warning"
                  showIcon
                  message="Đăng nhập để chấm điểm giao dịch."
                  description="Các API chấm điểm yêu cầu xác thực Bearer token."
                />
              )}

              {error && (
                <Alert
                  className="mb-4"
                  type="error"
                  showIcon
                  message="Không thể xử lý danh sách giao dịch"
                  description={error}
                />
              )}

              <Form
                form={form}
                layout="vertical"
                initialValues={{ transactions: initialTransactions }}
                onFinish={handleManualSubmit}
                disabled={!token}
              >
                <Form.List name="transactions">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size="large" className="w-full">
                      {fields.map(({ key, name, ...restField }, index) => (
                        <Card
                          key={key}
                          type="inner"
                          title={`Giao dịch #${index + 1}`}
                          extra={
                            fields.length > 1 ? (
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            ) : null
                          }
                        >
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Mã giao dịch"
                                name={[name, "transaction_seq"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "Nhập mã giao dịch",
                                  },
                                ]}
                              >
                                <InputNumber className="w-full" min={0} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Mã người dùng"
                                name={[name, "user_seq"]}
                              >
                                <InputNumber className="w-full" min={0} />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Số tiền nạp"
                                name={[name, "deposit_amount"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "Nhập số tiền nạp",
                                  },
                                ]}
                              >
                                <InputNumber
                                  className="w-full"
                                  min={0}
                                  step={0.01}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Quốc gia nhận"
                                name={[name, "receiving_country"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "Nhập quốc gia nhận",
                                  },
                                ]}
                              >
                                <Input placeholder="VN, US, ..." />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Mã quốc gia"
                                name={[name, "country_code"]}
                              >
                                <Input placeholder="VN" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Loại giấy tờ"
                                name={[name, "id_type"]}
                              >
                                <Input placeholder="passport, alien, ..." />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Stay qualify"
                                name={[name, "stay_qualify"]}
                              >
                                <Input placeholder="Resident / Non-resident" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Thời điểm giao dịch"
                                name={[name, "create_dt"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "Chọn thời điểm giao dịch",
                                  },
                                ]}
                              >
                                <Input type="datetime-local" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Ngày hết hạn visa"
                                name={[name, "visa_expire_date"]}
                              >
                                <Input type="date" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                label="Phương thức thanh toán"
                                name={[name, "payment_method"]}
                              >
                                <Input placeholder="BankTransfer, Card, ..." />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Collapse ghost>
                            <Panel header="Trường bổ sung" key="more">
                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Tên tài khoản"
                                    name={[name, "user_name"]}
                                  >
                                    <Input placeholder="Tên người dùng" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Người gửi"
                                    name={[name, "sender_name"]}
                                  >
                                    <Input placeholder="Tên người gửi" />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Người nhận"
                                    name={[name, "recipient_name"]}
                                  >
                                    <Input placeholder="Tên người nhận" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Autodebit account"
                                    name={[name, "autodebit_account"]}
                                  >
                                    <Input placeholder="Số tài khoản" />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Invite code"
                                    name={[name, "invite_code"]}
                                  >
                                    <Input placeholder="Mã mời" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Ngày đăng ký"
                                    name={[name, "register_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Giao dịch đầu tiên"
                                    name={[name, "first_transaction_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Ngày sinh"
                                    name={[name, "birth_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Ngày tái thẩm định"
                                    name={[name, "recheck_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Ngày face pin"
                                    name={[name, "face_pin_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Số GD 24h"
                                    name={[name, "transaction_count_24hour"]}
                                  >
                                    <InputNumber className="w-full" min={0} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Tổng tiền 24h"
                                    name={[name, "transaction_amount_24hour"]}
                                  >
                                    <InputNumber
                                      className="w-full"
                                      min={0}
                                      step={0.01}
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Số GD 1 tuần"
                                    name={[name, "transaction_count_1week"]}
                                  >
                                    <InputNumber className="w-full" min={0} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Tổng tiền 1 tuần"
                                    name={[name, "transaction_amount_1week"]}
                                  >
                                    <InputNumber
                                      className="w-full"
                                      min={0}
                                      step={0.01}
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Số GD 1 tháng"
                                    name={[name, "transaction_count_1month"]}
                                  >
                                    <InputNumber className="w-full" min={0} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    {...restField}
                                    label="Tổng tiền 1 tháng"
                                    name={[name, "transaction_amount_1month"]}
                                  >
                                    <InputNumber
                                      className="w-full"
                                      min={0}
                                      step={0.01}
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Panel>
                          </Collapse>
                        </Card>
                      ))}

                      <Button
                        type="dashed"
                        onClick={() => {
                          if (fields.length >= 10) {
                            return;
                          }
                          add(createDefaultTransaction(fields.length));
                        }}
                        icon={<PlusOutlined />}
                        block
                      >
                        Thêm giao dịch
                      </Button>
                    </Space>
                  )}
                </Form.List>

                <Space className="mt-4">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<PlayCircleOutlined />}
                  >
                    Chấm điểm
                  </Button>
                  <Button
                    onClick={() =>
                      form.setFieldsValue({
                        transactions: initialTransactions,
                      })
                    }
                    disabled={loading}
                  >
                    Khôi phục dữ liệu mẫu
                  </Button>
                  <Button
                    onClick={() => form.resetFields()}
                    disabled={loading}
                  >
                    Xóa tất cả
                  </Button>
                </Space>
              </Form>

              {manualResult && (
                <Card
                  className="mt-6"
                  type="inner"
                  title="Kết quả chấm điểm"
                  extra={
                    <Dropdown overlay={manualExportMenu} trigger={["click"]}>
                      <Button icon={<DownloadOutlinedIcon />}>Tải xuống</Button>
                    </Dropdown>
                  }
                >
                  <Space direction="vertical" className="w-full" size="middle">
                    <Space size="large">
                      <Text>
                        <Text strong>Tổng giao dịch:</Text> {manualResult.count}
                      </Text>
                      <Text>
                        <Text strong>Ngưỡng cảnh báo:</Text> {manualResult.threshold_low}
                      </Text>
                      <Text>
                        <Text strong>Ngưỡng từ chối:</Text> {manualResult.threshold_high}
                      </Text>
                    </Space>
                    {manualResult.model_version && (
                      <Text type="secondary">
                        Mô hình: {manualResult.model_version}
                        {manualResult.registry_version
                          ? ` • Registry: ${manualResult.registry_version}`
                          : ""}
                      </Text>
                    )}
                    <Table
                      columns={columns}
                      dataSource={manualRows}
                      expandable={{ expandedRowRender }}
                      pagination={false}
                      scroll={{ x: true }}
                    />
                  </Space>
                </Card>
              )}
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <UploadOutlined />
                  Tải lên file CSV
                </span>
              }
            >
              <Space direction="vertical" size="middle" className="w-full">
                <Paragraph className="!mb-0">
                  File CSV nên bao gồm tối thiểu các cột sau:
                  <br />
                  <code>{REQUIRED_COLUMNS.join(", ")}</code>.
                  <br />
                  Hệ thống sẽ giữ nguyên cột bổ sung để tiện theo dõi.
                </Paragraph>

                <Space size="middle" align="center">
                  <Switch
                    checked={includeAllow}
                    onChange={setIncludeAllow}
                    disabled={uploading || !token}
                  />
                  <Text>Trả về cả quyết định Allow</Text>
                </Space>

                <Space size="middle" align="center">
                  <Text>Top lý do</Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={topK}
                    onChange={(value) => setTopK(value || 3)}
                    disabled={uploading || !token}
                  />
                </Space>

                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadTemplate}
                  >
                    Tải mẫu CSV
                  </Button>
                  <Text type="secondary" className="flex items-center gap-1">
                    <InfoCircleOutlined />
                    Mẫu trích từ dữ liệu huấn luyện thực tế.
                  </Text>
                </Space>

                {uploadError && (
                  <Alert
                    type="error"
                    showIcon
                    message="Không thể xử lý file"
                    description={uploadError}
                  />
                )}

                <Upload.Dragger {...uploadProps} disabled={!token || uploading}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Kéo thả hoặc bấm để chọn file CSV
                  </p>
                  <p className="ant-upload-hint">
                    Dung lượng tối đa 5MB. Dữ liệu sẽ được xử lý ngay lập tức.
                  </p>
                </Upload.Dragger>

                {uploadResult && (
                  <Card
                    type="inner"
                    title="Kết quả từ file CSV"
                    extra={
                      <Dropdown overlay={uploadExportMenu} trigger={["click"]}>
                        <Button icon={<DownloadOutlinedIcon />}>
                          Tải xuống
                        </Button>
                      </Dropdown>
                    }
                  >
                    <Space direction="vertical" className="w-full" size="middle">
                      <Space size="large">
                        <Text>
                          <Text strong>Tổng giao dịch:</Text> {uploadResult.count}
                        </Text>
                        <Text>
                          <Text strong>Ngưỡng cảnh báo:</Text> {uploadResult.threshold_low}
                        </Text>
                        <Text>
                          <Text strong>Ngưỡng từ chối:</Text> {uploadResult.threshold_high}
                        </Text>
                      </Space>
                      {uploadResult.model_version && (
                        <Text type="secondary">
                          Mô hình: {uploadResult.model_version}
                          {uploadResult.registry_version
                            ? ` • Registry: ${uploadResult.registry_version}`
                            : ""}
                        </Text>
                      )}
                      <Table
                        columns={columns}
                        dataSource={uploadRows}
                        expandable={{ expandedRowRender }}
                        pagination={{ pageSize: 6 }}
                        scroll={{ x: true }}
                      />
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default BatchScoring;
