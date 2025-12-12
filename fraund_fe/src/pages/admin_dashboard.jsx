import React, { useState, useEffect } from "react";
import { Tabs, Card } from "antd";
import UserManagement from "../component/home/UserManagement";
import Statistics from "../component/statistics/index";
import EdaTab from "../component/eda/EdaTab";
import PreprocessingTab from "../component/preprocessing/PreprocessingTab";
import { useSelector } from "react-redux";
import { Result } from "antd";

const AdminDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role || "user";
  const [edaSummary, setEdaSummary] = useState(null);
  const [preprocessingSummary, setPreprocessingSummary] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch EDA and Preprocessing data
  useEffect(() => {
    const fetchInsights = async () => {
      setInsightsLoading(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${apiUrl}/api/insights`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEdaSummary(data.eda || {});
          setPreprocessingSummary(data.preprocessing || {});
        } else {
          console.error('Failed to fetch insights:', response.status);
          // Set default empty data if API call fails
          setEdaSummary({
            dataset: { rows: 0, cols: 0, sampleColumns: [] },
            labelDistribution: [],
            paymentMethods: [],
            countryDistribution: [],
            hourlyDistribution: [],
            amountHistogram: [],
            missingRates: [],
            calendar: { month: [], dayOfWeek: [], dayOfMonth: [] },
            corrPairs: [],
          });
          setPreprocessingSummary({
            clippingStats: {},
            categoricalEncoding: [],
            scalingPreview: [],
            pipelineShape: [],
            engineeredFeatures: [],
            engineeredDistributions: [],
          });
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
        // Set default empty data on error
        setEdaSummary({
          dataset: { rows: 0, cols: 0, sampleColumns: [] },
          labelDistribution: [],
          paymentMethods: [],
          countryDistribution: [],
          hourlyDistribution: [],
          amountHistogram: [],
          missingRates: [],
          calendar: { month: [], dayOfWeek: [], dayOfMonth: [] },
          corrPairs: [],
        });
        setPreprocessingSummary({
          clippingStats: {},
          categoricalEncoding: [],
          scalingPreview: [],
          pipelineShape: [],
          engineeredFeatures: [],
          engineeredDistributions: [],
        });
      } finally {
        setInsightsLoading(false);
      }
    };

    if (userRole === "admin") {
      fetchInsights();
    }
  }, [userRole]);

  // Verify user is admin
  if (userRole !== "admin") {
    return (
      <Result
        status="403"
        title="Truy cập bị từ chối"
        subTitle="Chỉ quản trị viên mới có thể truy cập trang này"
      />
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard quản trị</h1>
        <p className="text-gray-600">Quản lý người dùng, quyền hạn, mô hình và phân tích dữ liệu</p>
      </div>

      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: "users",
            label: "Quản lý người dùng",
            children: <UserManagement />,
          },
          {
            key: "model",
            label: "Quản lý mô hình",
            children: <Statistics />,
          },
          {
            key: "eda",
            label: "Phân tích dữ liệu (EDA)",
            children: <EdaTab edaSummary={edaSummary} loading={insightsLoading} />,
          },
          {
            key: "preprocessing",
            label: "Tiền xử lý & đặc trưng",
            children: <PreprocessingTab summary={preprocessingSummary} loading={insightsLoading} />,
          },
          {
            key: "logs",
            label: "Nhật ký hoạt động",
            children: (
              <Card>
                <p>Chức năng xem nhật ký sẽ được cập nhật sau</p>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AdminDashboard;
