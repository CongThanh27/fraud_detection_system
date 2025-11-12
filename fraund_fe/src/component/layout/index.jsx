import React from "react";
import { Outlet } from "react-router-dom";
import Header1 from "./header/index";
import Sider1 from "./sider/index";

import { Layout, Space } from "antd";
const { Header, Sider, Content,  } = Layout;
const Index = () => {

  const headerStyle = {
    padding: 0,
    backgroundColor: "transparent",
  };
  const contentStyle = {
    backgroundColor: "#F5F6F9",
    minHeight: "calc(100vh - 64px)",
    padding: 0,
    overflowY: "auto",
  };
  const siderStyle = {
    backgroundColor: "#ffffff",
    minHeight: "calc(100vh - 64px)",
    borderRight: "1px solid #f0f0f0",
    paddingTop: 24,
  };
  return (
    <>
      <Space
        direction="vertical"
        style={{
          width: "100%",
        }}
        size={[0, 48]}
      >
        <Layout>
          <Header style={headerStyle}>{<Header1 />}</Header>
          <Layout hasSider>
            <Sider className="!w-full" style={siderStyle}>{<Sider1/>}</Sider>
            <Content style={contentStyle}>{<Outlet />}</Content>
          </Layout>
        </Layout>
      </Space>
    </>
  );
};

export default Index;
