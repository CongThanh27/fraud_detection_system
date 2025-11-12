import axios from "axios";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { handelException } from "../services/handelException.js";

import { API_URL_BE } from '../config.js';
const URL = API_URL_BE;

const api = axios.create({
  baseURL: URL,
});
api.interceptors.request.use(
  (config) => {
    NProgress.start();
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
api.interceptors.response.use(
  async (response) => {
    NProgress.done();

    if (response && response.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    NProgress.done();
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Có lỗi xảy ra. Vui lòng thử lại.";
    handelException.handelNotificationSwal(message, "error");
    return Promise.reject(error);
  }
);
export default api;
