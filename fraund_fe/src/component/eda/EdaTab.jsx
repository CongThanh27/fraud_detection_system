import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Tag,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PieChartOutlined, LineChartOutlined, BarChartOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const EdaTab = ({ edaSummary, loading }) => {
  if (loading && !edaSummary) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: '16px', color: '#999' }}>
          Đang tải thống kê EDA từ pipeline preProcessing...
        </Paragraph>
      </Card>
    );
  }

  const summary = edaSummary || {
    labelDistribution: [],
    paymentMethods: [],
    countryDistribution: [],
    hourlyDistribution: [],
    amountHistogram: [],
    missingRates: [],
    calendar: { month: [], dayOfWeek: [], dayOfMonth: [] },
    corrPairs: [],
  };

  const calendar = summary.calendar || { month: [], dayOfWeek: [], dayOfMonth: [] };
  const missingRates = summary.missingRates || [];
  const corrPairs = summary.corrPairs || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {/* Summary Stats */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Tổng mẫu sau khi load"
              value={summary.dataset?.rows || 0}
              valueStyle={{ color: '#1890ff' }}
              suffix={`${summary.dataset?.rows ? ` (${summary.dataset?.cols} cột)` : ''}`}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Cập nhật: {summary.runAt ? new Date(summary.runAt).toLocaleString() : 'N/A'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Mất dữ liệu nhiều nhất"
              value={summary.missingRates?.[0]?.column || 'Ổn định'}
              prefix={summary.missingRates?.[0]?.rate ? '⚠️ ' : '✓ '}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {summary.missingRates?.[0]?.rate ? `${(summary.missingRates[0].rate * 100).toFixed(1)}% null` : 'Ít NA'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Số đặc trưng"
              value={summary.dataset?.cols || 0}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Ví dụ: {summary.dataset?.sampleColumns?.slice(0, 2).join(', ') || '...'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Label Distribution & Payment Methods */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title={<><PieChartOutlined /> Phân bố nhãn (Fraud vs Non-Fraud)</>}>
            {summary.labelDistribution?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.labelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu nhãn.</Text>
            )}
            <Alert
              message="Ghi chú: Tỉ lệ cao của Non-Fraud so với Fraud là bình thường; cần dùng class_weight để balance."
              type="info"
              style={{ marginTop: '12px' }}
              showIcon
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><BarChartOutlined /> Phương thức thanh toán</>}>
            {summary.paymentMethods?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" tick={{ fontSize: 10 }} angle={-45} height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Amount Distribution & Hourly Distribution */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title={<><BarChartOutlined /> Phân phối số tiền (histogram)</>}>
            {summary.amountHistogram?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.amountHistogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bin" tick={{ fontSize: 9 }} angle={-45} height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Tổng giao dịch" />
                  <Bar dataKey="is_fraud_count" fill="#ef4444" name="Giao dịch gian lận" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu histogram số tiền.</Text>
            )}
            <Alert
              message="Ghi chú: Các giao dịch gian lận tập trung ở mức giá cao hơn - cần clipping để normalize."
              type="info"
              style={{ marginTop: '12px' }}
              showIcon
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><LineChartOutlined /> Lưu lượng theo giờ giao dịch</>}>
            {summary.hourlyDistribution?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summary.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" label={{ value: 'Giờ', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Tổng giao dịch" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="fraud_count" name="Gian lận" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu hourly.</Text>
            )}
            <Alert
              message="Mẹo: Đỉnh vào giờ hành chính gợi ý hành vi hợp lệ; giao dịch đêm nhiều có thể là tín hiệu bất thường."
              type="info"
              style={{ marginTop: '12px' }}
              showIcon
            />
          </Card>
        </Col>
      </Row>

      {/* Calendar Distribution */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="Phân phối theo tháng">
            {calendar.month?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={calendar.month}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" label={{ value: 'Tháng', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu.</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Phân phối theo ngày trong tuần">
            {calendar.dayOfWeek?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={calendar.dayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Thứ', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu.</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Phân phối theo ngày trong tháng">
            {calendar.dayOfMonth?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={calendar.dayOfMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Text type="secondary">Chưa có dữ liệu.</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Correlation Pairs */}
      <Card title={<><BarChartOutlined /> Tương quan đặc trưng (top 6)</>}>
        {corrPairs?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {corrPairs.slice(0, 6).map((pair, idx) => {
              const corr = pair.correlation || 0;
              const intensity = Math.min(1, Math.abs(corr));
              const color = corr >= 0 
                ? `rgba(34,197,94,${0.15 + intensity * 0.6})`
                : `rgba(239,68,68,${0.15 + intensity * 0.6})`;
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9',
                    backgroundColor: color,
                  }}
                >
                  <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    {pair.col1}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                    ↔ {pair.col2}
                  </Text>
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    {pair.correlation?.toFixed(3)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Text type="secondary">Chưa đủ dữ liệu để tính corr.</Text>
        )}
      </Card>

      {/* Missing Rates */}
      <Card title="Cột thiếu dữ liệu (top)">
        {missingRates?.length ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {missingRates.slice(0, 10).map((item) => (
              <div key={item.column}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>{item.column}</Text>
                  <Tag color={item.missing_pct > 10 ? 'red' : item.missing_pct > 5 ? 'orange' : 'green'}>
                    {item.missing_pct?.toFixed(1)}%
                  </Tag>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      width: `${Math.min(100, item.missing_pct || 0)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #faad14, #ff7a45)',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Không có dữ liệu thiếu.</Text>
        )}
        <Alert
          message="Ghi chú: Các cột NA cao cần xem xét lại nguồn dữ liệu hoặc chiến lược điền giá trị trước khi huấn luyện."
          type="warning"
          style={{ marginTop: '16px' }}
          showIcon
        />
      </Card>
    </div>
  );
};

export default EdaTab;
