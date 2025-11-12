import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

import { EyeIcon } from '@heroicons/react/outline';
import { managementService } from '../../../services/test';
import { notify } from "../../../utils/notify";

import {
    Form,
    Input,
    InputNumber,
    Button,
    Flex,
    Divider
} from 'antd';


const App = () => {
    const dispatch = useDispatch();
    const { isModal, isEdit, employee } = useSelector(state => state.managementStore);
    const [form] = Form.useForm();

    useEffect(() => {
        if (isEdit) {
            console.log("g", employee);
            form.setFieldsValue({
                name: employee.name ? employee.name : '',
                phone: employee.phone ? employee.phone : '',
                email: employee.email ? employee.email : '',
                position: employee.position ? employee.position : '',
                employeeNumber: employee.employeeNumber ? employee.employeeNumber : '',
                createdAt: employee.createdAt ? employee.createdAt : '',
                updatedAt: employee.updatedAt ? employee.updatedAt : 'Not modify yet',
            });

        }
        else form.resetFields();
    }, [isEdit, employee]);


    const onFinish = async (values) => {
        if (isEdit) {
            delete values.createdAt;
            delete values.updatedAt;
            if (values.name === employee.name && values.phone === employee.phone && values.email === employee.email && values.position === employee.position && values.employeeNumber === employee.employeeNumber) {
                notify.notify1("No changes have been made!", "info","OK");
                return;
            }
        }
        const result = !isEdit ? await managementService.registerEmployee(values) : await managementService.modifyEmployee(values, parseInt(employee?.employeeNumber));
        if (result) {
            form.resetFields();
    
        }
    };

    const formItemLayout = {
        labelCol: {
            xs: {
                span: 24,
            },
            sm: {
                span: 7,
            },
        },
        wrapperCol: {
            xs: {
                span: 24,
            },
            sm: {
                span: 14,
            },
        },
    };

    const handleCancel = (e) => {
        form.resetFields();
    };


    return (
        <>
            <Modal title={`${isEdit ? 'Employee Modification' : 'Employee Registration'}`} open={isModal} onCancel={handleCancel}
                footer={[]}>
                <Form
                    {...formItemLayout}
                    variant="filled"
                    form={form}
                    onFinish={onFinish}
                    style={{
                        maxWidth: 800,
                    }}
                >

                    <Form.Item

                        label="Employee Number"
                        name="employeeNumber"
                        rules={[
                            {
                                required: true,
                                message: 'Please input!',
                            },
                        ]}

                    >
                        <InputNumber
                            style={{
                                width: '100%',
                            }}
                        />
                    </Form.Item>
                    <Form.Item

                        label="Employee Name"
                        name="name"
                        rules={[
                            {
                                required: true,
                                message: 'Please input!',
                            },
                            {
                                pattern: /^[a-zA-Zᄀ-힣]{1,10}$/,
                                message: 'Invalid input! Please enter characters only (max 10 characters).', // Message lỗi
                            },
                        ]}
                        validateTrigger="onBlur"

                    >
                        <Input />
                    </Form.Item>
                    <Form.Item

                        label="Position"
                        name="position"
                        rules={[
                            {
                                required: true,
                                message: 'Please input!',
                            },

                        ]}

                    >
                        <Input />
                    </Form.Item>
                    <Form.Item

                        label="Phone number"
                        name="phone"
                        rules={[
                            {
                                required: true,
                                message: 'Please input!',
                            },
                            {
                                pattern: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
                                message: ' Invalid input! Phone must match the format XX-XXX-XXXX or XXX-XXXX-XXXX.', // Message lỗi
                            },
                        ]}
                        validateTrigger="onBlur"

                    >
                        <Input />
                    </Form.Item>
                    <Form.Item

                        label="Email"
                        name="email"
                        rules={[
                            {
                                required: true,
                                message: 'Please input!',
                            },
                            {
                                pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                message: 'Invalid input! Please enter a valid email address.', // Message lỗi
                            },
                        ]}
                        validateTrigger="onBlur"

                    >
                        <Input />
                    </Form.Item>
                    {isEdit && <>
                        <Divider />
                        <Form.Item
                            label="Sign up date:"
                            name="createdAt"

                        >
                            <Input readOnly className=" cursor-not-allowed " suffix={<EyeIcon className="h-5 w-5 text-gray-400" />} />
                        </Form.Item>
                        <Form.Item
                            label="Last modified:"
                            name="updatedAt"
                        >
                            <Input readOnly className=" cursor-not-allowed" suffix={<EyeIcon className="h-5 w-5 text-gray-400" />} />
                        </Form.Item>
                        <Divider />
                    </>}

                    <Form.Item
                        wrapperCol={{
                            offset: 6,
                            span: 15,
                        }}
                    >

                        <Flex justify="end" wrap="wrap" gap="small" className="site-button-ghost-wrapper !mb-2">
                            <Button className="bg-[#1677FF]" type="primary" htmlType="submit">
                                {isEdit ? 'Modify' : 'Register'}
                            </Button>
                            <Button type="primary" ghost onClick={handleCancel}>
                                Cancel
                            </Button>
                        </Flex>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
export default App;