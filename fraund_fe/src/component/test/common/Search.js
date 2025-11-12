import React from "react";
import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space } from 'antd';
import { useState } from 'react';
import { notify } from "../../../utils/notify";
import { useDispatch } from 'react-redux';
import { validatePhone, validateEmail } from '../../../utils/validationUtils';

const Search = () => {
    const dispatch = useDispatch();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [statusPhone, setStatusPhone] = useState('');
    const [statusEmail, setStatusEmail] = useState('');
    const [number, setNumber] = useState('');
    const [position, setPosition] = useState('');


    const phoneValidate = (inputValue) => {
        if (inputValue === '')
            setStatusPhone('');
        else if (!validatePhone(inputValue))
            setStatusPhone('error');

    }
    const emailValidate = (inputValue) => {
        if (inputValue === '')
            setStatusEmail('');
        else if (!validateEmail(inputValue))
            setStatusEmail('error');


    }
    const handleNameChange = (e) => {
        setName(e.target.value);
    };
    const handlePhoneChange = (e) => {
        setStatusPhone('');
        setPhone(e.target.value);
    };
    const handleEmailChange = (e) => {
        setStatusEmail('');
        setEmail(e.target.value);
    };
    const handleNumberChange = (e) => {
        setNumber(e.target.value);
    };
    const handlePositionChange = (e) => {
        setPosition(e.target.value);
    };



    const handleSubmit = (e) => {
        e.preventDefault();
        if (phone === '' && email === '' && name === '' && number === '' && position === '') {
            notify.notify1('Please enter at least one field', 'info', 'OK');
      
        }
        else if (phone !== '' && !validatePhone(phone)) {
            notify.notify1('Phone must match the format XX-XXX-XXXX or XXX-XXXX-XXXX', 'error');
            setStatusPhone('error');
        }
        else if (email !== '' && !validateEmail(email)) {
            notify.notify1('Invalid email address', 'error');
            setStatusEmail('error');
        }
        else {
            let data = {
                employeeNumber: number,
                name: name,
                phone: phone,
                email: email,
                position: position
            };
 

        }

    };
    const handleClear = () => {
        if (phone === '' && email === '' && name === '' && number === '' && position === '') {
            notify.notify1('Please enter at least one field', 'info', 'OK');
        }
        else {
            setName('');
            setPhone('');
            setEmail('');
            setNumber('');
            setPosition('');
            setStatusPhone('');
            setStatusEmail('');
        }

    }

    return (
        <>
            <Space direction="vertical" size="middle">
                <Space.Compact size="large">
                    <Input value={number} type="number" addonBefore={<SearchOutlined />} placeholder="Number" onChange={handleNumberChange} />
                    <Input value={name} placeholder="Name" onChange={handleNameChange} />
                    <Input value={phone} status={statusPhone} onBlur={() => phoneValidate(phone)} onChange={handlePhoneChange} placeholder="Phone" pattern="^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$" title="Phone must match the format XX-XXX-XXXX or XXX-XXXX-XXXX" />
                    <Input value={email} status={statusEmail} onBlur={() => emailValidate(email)} onChange={handleEmailChange} placeholder="Email" type="email" pattern="^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$" title="Invalid email address" />
                    <Input value={position} placeholder="Position" onChange={handlePositionChange} />
                    <Button onClick={handleSubmit} className="bg-[#1677FF]" type="primary">Search</Button>
                    <Button onClick={handleClear} danger type="primary">Clear</Button>
                </Space.Compact>

            </Space>

        </>
    );
};

export default Search;
//phím tắt tạo nhanh: rafce

