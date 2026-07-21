"use client";

import { loginWithBackend, LOGIN_METHODS } from "@/services/auth/login";
import { getEcomAccessToken } from "@/services/auth/getEcomAccessToken";

export async function loginWithBackendAndPersist({ orgId, email, password, method, qrSession }) {
  const res = await loginWithBackend({ orgId, email, password, method, qrSession });

  const userInfo = res?.data?.userInfo;
  if (userInfo) {
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
  }

  const ecomRes = await getEcomAccessToken();
  const ecomToken = ecomRes?.data?.accessToken;
  if (ecomToken) {
    localStorage.setItem("ecomm_token", ecomToken);
  }

  return userInfo;
}

export function logout() {
  localStorage.removeItem("userInfo");
  localStorage.removeItem("ecomm_token");
}

export { LOGIN_METHODS };
