import React from 'react';
import {
  Card,
  Row,
  Col,
  Alert,
  Space,
  Tag,
  Typography,
  Divider,
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BgColorsOutlined, DatabaseOutlined, FunctionOutlined, SkinOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const PreprocessingTab = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <Paragraph style={{ color: '#999' }}>
          Đang tải luồng tiền xử lý và đặc trưng...
        </Paragraph>
      </Card>
    );
  }

  const data = summary || {
    clippingStats: {},
    categoricalEncoding: [],
    scalingPreview: [],
    pipelineShape: [],
    engineeredFeatures: [],
    engineeredDistributions: [],
  };

  const formatNumber = (value) => 
    value || value === 0 ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {/* Pipeline Steps */}
      <Card 
        title={<><DatabaseOutlined /> Luồng xử lý từ preProcessing</>}
        extra={<Text type="secondary">Load → Làm sạch → Feature → Encode + Scale</Text>}
      >
        <Row gutter={16}>
          {data.pipelineShape?.map((step, idx) => (
            <Col xs={24} sm={12} md={8} key={idx}>
              <Card bordered style={{ 
                backgroundColor: '#fafafa',
                borderColor: '#e6e6e6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <Text strong style={{ display: 'block' }}>{step.stage}</Text>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                      {step.description}
                    </Text>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {step.rows.toLocaleString()} dòng • {step.columns} cột
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Columns per Stage */}
      <Card title={<><FunctionOutlined /> Số lượng cột theo từng bước</>}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.pipelineShape || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="columns" name="Số cột" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
        <Alert
          message="Bước aligned thêm feature thời gian/logic; encoded biến các cột phân loại thành số; scaled chuẩn hoá thang đo."
          type="info"
          style={{ marginTop: '16px' }}
          showIcon
        />
      </Card>

      {/* Clipping Before/After */}
      <Card title={<><BgColorsOutlined /> Thống kê clipping theo cột (IQR method)</>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {Object.entries(data.clippingStats || {}).slice(0, 5).map(([col, stats]) => (
            <div key={col}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>{col}</Text>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff7e6', 
                    borderRadius: '6px',
                    border: '1px solid #ffd591'
                  }}>
                    <Text strong style={{ color: '#ad6800', display: 'block', marginBottom: '8px' }}>Trước clipping</Text>
                    <div style={{ fontSize: '11px', color: '#595959' }}>
                      <div>Min: {formatNumber(stats.original_min)}</div>
                      <div>Max: {formatNumber(stats.original_max)}</div>
                      <div>Mean: {formatNumber(stats.original_mean)}</div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#e6f7ff', 
                    borderRadius: '6px',
                    border: '1px solid #91d5ff'
                  }}>
                    <Text strong style={{ color: '#0050b3', display: 'block', marginBottom: '8px' }}>Sau clipping</Text>
                    <div style={{ fontSize: '11px', color: '#595959' }}>
                      <div>Min: {formatNumber(stats.clipped_min)}</div>
                      <div>Max: {formatNumber(stats.clipped_max)}</div>
                      <div>Mean: {formatNumber(stats.clipped_mean)}</div>
                      <div>Values clipped: {stats.values_clipped}</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          ))}
        </Space>
        <Alert
          message="Cắt ngoại lệ (IQR method) giảm độ lệch chuẩn, giúp scaler hoạt động ổn định và tránh chi phối bởi outlier."
          type="info"
          style={{ marginTop: '16px' }}
          showIcon
        />
      </Card>

      {/* Scaling Preview */}
      <Card title={<><SkinOutlined /> Bản xem trước scaling các đặc trưng (StandardScaler)</>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #d9d9d9' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Cột</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Min</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Max</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Mean (Trước)</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Mean (Sau)</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Std (Sau)</th>
              </tr>
            </thead>
            <tbody>
              {(data.scalingPreview || []).slice(0, 8).map((item, idx) => (
                <tr style={{ borderBottom: '1px solid #d9d9d9' }} key={idx}>
                  <td style={{ padding: '8px' }}>{item.column}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(item.min_value)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(item.max_value)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(item.original_mean)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(item.scaled_mean)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(item.scaled_std)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert
          message="Mean ~0 và Std ~1 sau scaling cho thấy StandardScaler đã chuẩn hoá thành công."
          type="info"
          style={{ marginTop: '12px' }}
          showIcon
        />
      </Card>

      {/* Categorical Encoding */}
      <Card title={<><BgColorsOutlined /> Mã hoá Categorical Columns</>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {(data.categoricalEncoding || []).map((cat, idx) => (
            <div key={idx}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                {cat.column} ({cat.unique_count} giá trị unique)
              </Text>
              <div style={{ marginLeft: '16px', fontSize: '12px' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                  Top values:
                </Text>
                {cat.top_values?.slice(0, 5).map((val, i) => (
                  <Tag key={i} style={{ marginBottom: '4px' }}>
                    {val.value} ({val.count})
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </Space>
        <Alert
          message="Các cột phân loại được mã hoá One-Hot hoặc Ordinal tùy vào heuristic; các giá trị không thấy trong training được xử lý bằng cách đặt thành 'Unknown'."
          type="info"
          style={{ marginTop: '16px' }}
          showIcon
        />
      </Card>

      {/* Feature Engineering */}
      <Card title={<><FunctionOutlined /> Kỹ thuật Đặc trưng (Feature Engineering)</>}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '12px', color: '#1890ff' }}>
                ⏰ Đặc trưng thời gian
              </Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(data.engineeredFeatures || []).filter(f => f.type === 'numeric').map((feat) => (
                  <div key={feat.name}>
                    <Tag color="blue">{feat.name}</Tag>
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                      {feat.description}
                    </Text>
                  </div>
                ))}
              </Space>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '12px', color: '#52c41a' }}>
                🎯 Đặc trưng rủi ro
              </Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(data.engineeredFeatures || []).filter(f => f.type !== 'numeric').map((feat) => (
                  <div key={feat.name}>
                    <Tag color="green">{feat.name}</Tag>
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                      {feat.description}
                    </Text>
                  </div>
                ))}
              </Space>
            </div>
          </Col>
        </Row>

        <Divider />

        <div>
          <Text strong style={{ display: 'block', marginBottom: '12px' }}>
            📊 Phân bố đặc trưng kỹ thuật
          </Text>
          {(data.engineeredDistributions || []).length > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {data.engineeredDistributions.map((eng, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  backgroundColor: '#fafafa',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9'
                }}>
                  <Text strong style={{ fontSize: '12px' }}>{eng.feature}</Text>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#595959' }}>
                    {eng.night_transactions !== undefined && (
                      <>
                        <div>Giao dịch ban đêm: {eng.night_transactions}</div>
                        <div>Giao dịch ban ngày: {eng.day_transactions}</div>
                        <div>Fraud rate (đêm): {eng.night_fraud_rate?.toFixed(2)}%</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Space>
          ) : (
            <Text type="secondary">Đang tính toán...</Text>
          )}
        </div>
      </Card>

      <Alert
        message="Quy trình tiền xử lý: Load → Làm sạch → Feature Engineering → Encode → Clipping → Scaling"
        type="success"
        showIcon
      />
    </div>
  );
};

export default PreprocessingTab;
