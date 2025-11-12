import axios from "axios";
//NProgress: Thư viện cho việc hiển thị thanh tiến trình (progress bar).
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { handelException } from "../services/handelException";
import { API_URL_BE } from '../config.js';
const URL = API_URL_BE;
//Tạo một khách hàng Axios:
const apiClient = axios.create({
  baseURL: URL,
});

//Khi một yêu cầu được thực hiện
apiClient.interceptors.request.use(
  async (config) => {
    NProgress.start();
    config.headers = config.headers || {};
    const accessToken = await checkTokens();
    if (accessToken) {
      config.headers.Authorization = "Bearer " + accessToken;
    } else {
      config.cancelToken = new axios.CancelToken((cancel) => cancel());
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.headers &&
      !config.headers["Content-Type"] &&
      config.data &&
      typeof config.data === "object"
    ) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
apiClient.interceptors.response.use(
  async (response) => {
    NProgress.done();
    if (response && response.data) {
      return response.data;
    }

    return response;
  },
  (error) => {
    handelException.handelExceptions(error);
    NProgress.done();
    return Promise.reject(error);
  }
);

const checkTokens = async () => {
  const accessToken = localStorage.getItem("token");

  if (!accessToken) {
    console.log("Không có token");
    return;
  }

  const payload = decodeToken(accessToken);
  if (isTokenExpired(payload)) {
    clearLocalStorage();
    return;
  }
  return accessToken;
};

const clearLocalStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("auth_user");
};

const decodeToken = (token) => {
  try {
    const [, payloadBase64] = token?.split(".");
    return JSON.parse(atob(payloadBase64));
  } catch (error) {
    console.warn("Failed to decode token", error);
    return null;
  }
};

const isTokenExpired = (payload) => {
  if (!payload) {
    return true;
  }
  const expirationTime = payload.exp;
  const currentTime = Math.floor(Date.now() / 1000);
  return expirationTime < currentTime;
};

export default apiClient;
