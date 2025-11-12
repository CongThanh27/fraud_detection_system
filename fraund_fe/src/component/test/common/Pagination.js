import React from 'react';
import { Pagination } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

const App = () => {
    const dispatch = useDispatch();
    const { haveHata } = useSelector(state => state.managementStore);
    const { page, size, currentPage, totalItems } = useSelector(state => state.managementStore);
    const handlePaginationChange = (pageI, pageSize) => {
        console.log(pageI, pageSize);
        if (pageI === page && pageSize === size) {
            return;
        }
        console.log(haveHata);
       
    };

    return (
        <>
            <Pagination
                total={totalItems}
                showTotal={(total) => `Total ${total} items`}
                showSizeChanger
                pageSizeOptions={['5', '10', '15', '20', '50']}
                defaultPageSize={size}
                defaultCurrent={currentPage}
                onChange={handlePaginationChange}
            />
        </>

    );

}
export default App;