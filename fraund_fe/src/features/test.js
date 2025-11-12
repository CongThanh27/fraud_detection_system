import { createSlice } from "@reduxjs/toolkit";

const managementStoreSlice = createSlice({
    name: "counter",
    initialState: {
        //List
        isFetching: true,
        employees: [],
        page: 1,
        size: 10,
        currentPage: 1,
        totalPage: 1,
        totalItems: 0,
        //Edit
        employee: {},
        //Search
        isSearch: false,
        filter: {
        },
        haveHata: false,

        isModal: false,
        isEdit: false,
        //info
        isShowDrawer: false,
        
    },
    reducers: {
        setEmployees(state, action) {
            state.employees = action.payload;
        },
        setEmployee(state, action) {
            state.employee = action.payload;
        },

        setIsSearch(state, action) {
            state.isSearch = action.payload;
        },
        setFilter(state, action) {
            state.filter = action.payload;
        },
        setTotalPage(state, action) {
            state.totalPage = action.payload;
        },
        setTotalItems(state, action) {
            state.totalItems = action.payload;
        },
        setCurrentPage(state, action) {
            state.currentPage = action.payload;
        },
        setPage(state, action) {
            state.page = action.payload;
        },
        setPageSize(state, action) {
            state.size = action.payload;
        },
        setIsFetching(state, action) {
            state.isFetching = action.payload;
        },
        setHavaData(state, action) {
            state.haveHata = action.payload;
        },
        setIsModalAdd(state, action) {
            state.isModal = action.payload;
        },
        setIsEdit(state, action) {
            state.isEdit = action.payload;
        },
        setIsShowDrawer(state, action) {
            state.isShowDrawer = action.payload;
        },
    },

});
export const {
    setEmployees,
    setEmployee,
    setIsSearch,
    setFilter,
    setTotalPage,
    setTotalItems,
    setCurrentPage,
    setPage,
    setIsFetching,
    setHavaData,
    setPageSize,
    setIsModalAdd,
    setIsEdit,
    setIsShowDrawer,
 

} = managementStoreSlice.actions;
export default managementStoreSlice.reducer;


//import { setEdit } from '../../../../../features/employerSlice.js';
// import { useDispatch, useSelector } from "react-redux";
//   const showModalAdd = () => {
//     dispatch(setIsModalAdd(true));
//   };
//  const search = useSelector((state) => state.test.titleSearch);