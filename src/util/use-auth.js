"use client";

import { loginWithBackend, LOGIN_METHODS } from "@/services/auth/login";

const AUTH_COOKIE = "auth-token";
const COOKIE_MAX_AGE_DAYS = 7;

function setAuthCookie(token) {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export async function loginWithBackendAndPersist({ orgId, email, password, method, qrSession }) {
  const data = await loginWithBackend({ orgId, email, password, method, qrSession });

  if (data?.token) {
    setAuthCookie(data.token);
    localStorage.setItem("authToken", data.token);
  }
  if (data?.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  if (data?.shops) {
    localStorage.setItem("shops", JSON.stringify(data.shops));
  }

  return data;
}

export function logout() {
  clearAuthCookie();
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("shops");
}

export { LOGIN_METHODS };
