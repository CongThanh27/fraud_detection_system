import { authService } from "./authService";

async function login(data) {
  return authService.login(data);
}

async function getProfile() {
  return authService.fetchProfile();
}

export const loginService = {
  login,
  getProfile,
};
