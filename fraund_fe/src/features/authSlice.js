import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authService } from "../services/authService";

const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

const persistedToken = (() => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
})();

const persistedUser = (() => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.fetchProfile();
      if (!response) {
        return rejectWithValue("Không thể lấy thông tin người dùng");
      }
      if (typeof response === "object" && response.code && response.code !== 200) {
        return rejectWithValue(response.message || "Không thể lấy thông tin người dùng");
      }
      localStorage.setItem(USER_KEY, JSON.stringify(response));
      return response;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Không thể lấy thông tin người dùng";
      authService.clearSession();
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  user: persistedUser,
  token: persistedToken,
  status: persistedToken ? "authenticated" : "unauthenticated",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload?.user ?? null;
      state.token = action.payload?.token ?? null;
      state.status = state.token ? "authenticated" : "unauthenticated";
      state.error = null;
      if (state.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
      if (state.token) {
        localStorage.setItem(TOKEN_KEY, state.token);
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.status = "unauthenticated";
      state.error = null;
      authService.clearSession();
    },
    setAuthError(state, action) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload || null;
        state.status = state.user ? "authenticated" : "unauthenticated";
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.status = "unauthenticated";
        state.error = action.payload || "Không thể lấy thông tin người dùng";
      });
  },
});

export const { setCredentials, clearCredentials, setAuthError } = authSlice.actions;

export default authSlice.reducer;
