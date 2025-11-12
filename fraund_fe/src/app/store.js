import { configureStore } from "@reduxjs/toolkit";
import managementStoreSlice from "../features/test";
import authReducer from "../features/authSlice";

export const store = configureStore({
  reducer: {
    managementStore: managementStoreSlice,
    auth: authReducer,
    // Add other slices here as needed
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(),
});
