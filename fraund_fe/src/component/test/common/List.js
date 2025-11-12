// import React, { useEffect } from "react";
// import { useDispatch, useSelector } from 'react-redux';
import { managementService } from '../../../services/test';
import { Space, Table, Tag, Button } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { notify } from "../../../utils/notify";

const List = () => {
    // const dispatch = useDispatch();
    // const { isSearch, isFetching } = useSelector(state => state.managementStore);
    // const { page, size, employees, filter } = useSelector(state => state.managementStore);

    const handleModify = (employee) => {

    }
    const handleDelete = async (employee) => {
        const confirm = await notify.notify2("Delete Employee", "warning", "Are you sure you want to delete this employee?", "Yes", "No");
        if (confirm) {
            const result = await managementService.deleteEmployee(employee.employeeNumber);
            if (result) {
              
            }
        }
    }
    const handelEmployeeDetailedInformation = (employee) => { 
 
    }

    // useEffect(() => {

    //     const searchEmployees = async () => {
    //         const response = await managementService.search(filter, page, size);

    //     }
    //     if (isSearch === true) {
    //         searchEmployees();
        
    //     }

    // }, [isSearch, page, size]);

    // useEffect(() => {
    //     const fetchEmployees = async () => {
    //         const response = await managementService.list(page, size);

    //     }
    //     if (isFetching === true) {
    //         fetchEmployees();
  
    //     }

    // }, [isFetching, page, size]);

    const columns = [
        {
            title: 'Employee Number',
            dataIndex: 'employeeNumber',
            key: 'employeeNumber',
            render: text => <a>{text}</a>,
        },
        {
            title: 'Full Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, employee) => (<button onClick={()=>handelEmployeeDetailedInformation(employee)}>{text}</button>),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: text => <a>{text}</a>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: text => <a>{text}</a>,
        },
        {
            title: 'Position',
            key: 'position',
            dataIndex: 'position',
            render: position => (
                <>
                    {/* let color ='geekblue' : 'green'; */}
                    <Tag color={`${position.toUpperCase() === 'manage' ? 'green' : 'geekblue'}`}>
                        {position.toUpperCase()}
                    </Tag>
                </>
            ),
        },
        {
            title: 'Modifiction Date',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: text => <a>{text == null ? 'Not modify yet' : text}</a>,
        },

        {
            title: 'Action',
            dataIndex: 'employeeNumber',
            key: 'employeeNumber',
            render: (employeeNumber, employee) => (
                <Space size="middle">
                    <Button onClick={() => handleModify(employee)} className="bg-[#1677FF]" type="primary" shape="circle" icon={<EditOutlined />} />
                    <Button onClick={() => handleDelete(employee)} danger className="bg-[#1677FF]" type="primary" shape="circle" icon={<DeleteOutlined />} />
                </Space>
            ),

        },

    ];


    return (
        <>
            {/* <Table className="!w-full" columns={columns} dataSource={employees} pagination={false} /> */}
            <Table className="!w-full" columns={columns} dataSource={[]} pagination={false} />
        </>
    );
};

export default List;