import apiAuth from "../utils/apiAuth";
import { handelException } from "./handelException";

// Get all users (admin only)
async function getAllUsers() {
  try {
    const response = await apiAuth.get("/admin/users");
    if (response?.code && response.code !== 200) {
      return [];
    }
    return response?.users || response?.data?.users || [];
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

// Update user role (admin only)
async function updateUserRole(userId, role) {
  try {
    const response = await apiAuth.put(`/admin/users/${userId}/role`, {
      role: role,
    });
    
    if (response?.code && response.code !== 200) {
      throw new Error(response.message || "Failed to update role");
    }
    
    return response;
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

// Disable/Enable user (admin only)
async function toggleUserStatus(userId, isActive) {
  try {
    const response = await apiAuth.put(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    
    if (response?.code && response.code !== 200) {
      throw new Error(response.message || "Failed to update user status");
    }
    
    return response;
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

export const userManagementService = {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
};
