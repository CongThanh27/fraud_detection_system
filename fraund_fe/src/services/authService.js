import api from "../utils/api";
import apiAuth from "../utils/apiAuth";
import { handelException } from "./handelException";

const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

function persistSession({ token, user, username }) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  const nextUser = user ?? (username ? { username } : null);
  if (nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function extractAuthPayload(response) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const token =
    response.access_token ??
    response.token ??
    response.accessToken ??
    response.data?.access_token ??
    response.data?.token ??
    response.result?.access_token ??
    response.result?.token;

  const username =
    response.username ??
    response.data?.username ??
    response.result?.username ??
    response.user?.username ??
    response.profile?.username ??
    null;

  const user =
    response.user ??
    response.profile ??
    response.data?.user ??
    response.result?.user ??
    (username ? { username } : null) ??
    null;

  return {
    token: token || null,
    user: user || null,
    username: username || (user && user.username) || null,
    raw: response,
  };
}

function decodeJwt(token) {
  try {
    const [, payloadBase64] = token.split(".");
    return JSON.parse(atob(payloadBase64));
  } catch (error) {
    console.warn("Failed to decode JWT", error);
    return null;
  }
}

async function login(credentials) {
  try {
    const formData = new URLSearchParams();
    if (credentials.username) {
      formData.append("username", credentials.username.trim());
    }
    if (credentials.email && !credentials.username) {
      formData.append("username", credentials.email.trim());
    }
    formData.append("password", credentials.password);
    formData.append("grant_type", "password");

    const response = await api.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const payload = extractAuthPayload(response);

    if (!payload?.token) {
      handelException.handelNotificationSwal(
        response?.detail || response?.message || "Login failed. Please try again.",
        "error"
      );
      return null;
    }

    const userInfo =
      payload.user ||
      (payload.username ? { username: payload.username } : null) ||
      (() => {
        const decoded = decodeJwt(payload.token);
        if (!decoded) {
          return null;
        }
        return decoded.sub ? { id: Number(decoded.sub) || decoded.sub } : null;
      })();

    persistSession({
      token: payload.token,
      user: userInfo,
      username: payload.username,
    });
    handelException.handelNotificationSwal("Đăng nhập thành công", "success");
    return {
      ...payload,
      user: userInfo,
    };
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function registerAccount(data) {
  try {
    const payload = {
      username: data.username?.trim() || data.email?.trim(),
      password: data.password,
    };

    const response = await api.post("/auth/register", payload);

    if (response?.code && response.code !== 200) {
      handelException.handelNotificationSwal(
        response.message || "Registration failed",
        "error"
      );
      return null;
    }

    handelException.handelNotificationSwal(
      response?.message || "Đăng ký thành công",
      "success"
    );

    const authPayload = extractAuthPayload(response);
    if (authPayload?.token) {
      persistSession(authPayload);
    } else if (payload.username) {
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({ username: payload.username })
      );
    }

    return authPayload ?? { raw: response };
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function fetchProfile() {
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue decoding from token
    }
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error("No authentication token found.");
  }

  const decoded = decodeJwt(token);
  if (!decoded) {
    throw new Error("Unable to decode authentication token.");
  }

  return {
    id: decoded.sub ? Number(decoded.sub) || decoded.sub : undefined,
    username: decoded.username || decoded.preferred_username || null,
    exp: decoded.exp,
  };
}

async function logout() {
  try {
    await apiAuth.post("/auth/logout");
  } catch (error) {
    console.warn("Failed to revoke token on server:", error);
  } finally {
    clearSession();
  }
}

export const authService = {
  login,
  registerAccount,
  fetchProfile,
  logout,
  persistSession,
  clearSession,
  extractAuthPayload,
};
