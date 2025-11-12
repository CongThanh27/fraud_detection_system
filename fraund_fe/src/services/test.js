// import api from "../utils/api";
// import { handelException } from "./handelException";

// async function search(filter, page, size) {
//     try {
//         const apiUrl = `/employee/search`
//         const queryParams = [];
//         if (filter) {
//             for (const key in filter) {
//                 if (filter[key] !== undefined && filter[key] !== null && filter[key] !== '') {
//                     queryParams.push(`${key}=${filter[key]}`);
//                 }
//             }
//         }
//         const url = `${apiUrl}?size=${size}&page=${page}&${queryParams.join('&')}`
  
//         const response = await api.get(
//             url
//         );
//         if (response.code === 200) 

//             return response.result; 
//         else 
//         {
//             handelException.handelNotificationSwal(response.message, "error");
//         }
//     } catch (error) {
//         console.error("Error fetching location data:", error);
//     }
// }
// async function list (page, size) {
//     try {
//         const url = `/employee?size=${size}&page=${page}`
//         const response = await api.get(
//             url
//         );
//         if (response.code === 200) 

//             return response.result; 
//         else 
//         {
//             handelException.handelNotificationSwal(response.message, "error");
//         }
//     } catch (error) {
//         console.error("Error fetching location data:", error);
//     }
// }
// async function registerEmployee(data) {
//     try {
//       const rs = await api.post("/employee", data);
//       if (rs && rs.code === 200) {
//         handelException.handelNotificationSwal(rs.message, "success");
//         return rs;
//       } else {
//         handelException.handelNotificationSwal(rs.message, "error");
//       }
//     } catch (error) {
//       console.log("registerEmployee", error);
//     }
//   }
//   async function modifyEmployee(data, employeeNumber) {
//     try {
//       const rs = await api.put(`/employee/${employeeNumber}`, data);
//       if (rs && rs.code === 200) {
//         handelException.handelNotificationSwal(rs.message, "success");
//         return rs;
//       } else {
//         handelException.handelNotificationSwal(rs.message, "error");
//       }
//     } catch (error) {
//       console.log("modifyEmployee", error);
//     }
//   }
//   async function deleteEmployee(employeeNumber) {
//     try {
//       const rs = await api.delete(`/employee/${employeeNumber}`);
//       if (rs && rs.code === 200) {
//         handelException.handelNotificationSwal(rs.message, "success");
//         return rs;
//       } else {
//         handelException.handelNotificationSwal(rs.message, "error");
//       }
//     } catch (error) {
//       console.log("deleteEmployee", error);
//     }
//   }

// export const managementService = {
//     search,
//     list,
//     registerEmployee,
//     modifyEmployee,
//     deleteEmployee
// }