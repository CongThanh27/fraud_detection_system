import React, { useState } from 'react';
import { Col, Divider, Drawer, Row } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

const DescriptionItem = ({ title, content }) => (
    <div className="site-description-item-profile-wrapper">
        <p className="site-description-item-profile-p-label">
            <strong>{title}: </strong>{content}
        </p>


    </div>
)
const DescriptionEmployee = () => {
    const dispatch = useDispatch();
    const { isShowDrawer, employee } = useSelector(state => state.managementStore);
    const onClose = () => {
        
    };
    return (
        <>
            <Drawer width={940} placement="right" closable={false} onClose={onClose} open={isShowDrawer}>
                <p
                    className="site-description-item-profile-p"
                    style={{
                        marginBottom: 24,
                    }}
                >
                    <strong> Employee Detailed Information </strong>
                </p>
                <Divider />
                <p className="site-description-item-profile-p"> <strong> {employee.name} </strong></p>
                <Divider />
                <Row>
                    <Col span={12}>
                        <DescriptionItem title="Employee Number" content={employee.employeeNumber} />
                    </Col>
                    <Col span={12}>
                        <DescriptionItem title="Position" content={employee.position} />
                    </Col>
                </Row>
                <Row>
                    <Divider />
                    <Col span={12}>
                        <DescriptionItem title="Phone number" content={employee.phone} />
                    </Col>
                    <Col span={12}>
                        <DescriptionItem title="Email" content={employee.email} />
                    </Col>
                </Row>
                <Divider />
                <Row>
                    <Col span={12}>
                        <DescriptionItem title="Sign up date:" content={employee.createdAt} />
                    </Col>
                </Row>
                <Divider />

            </Drawer>
        </>
    );
};
export default DescriptionEmployee;