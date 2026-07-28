"use client";

import { loginWithBackend, LOGIN_METHODS } from "@/services/auth/login";
import { getEcomAccessToken } from "@/services/auth/getEcomAccessToken";
import { store } from "@/store";
import { resetPosState } from "@/hooks/useResetPOS";

export const AUTH_CHANGE_EVENT = "pos-auth-change";

export async function loginWithBackendAndPersist({
  orgId,
  email,
  password,
  method,
  qrSession,
  accountId,
  pin,
}: {
  orgId?: string
  email?: string
  password?: string
  method: string
  qrSession?: string
  accountId?: string | number
  pin?: string
}) {
  const res = await loginWithBackend({ orgId, email, password, method, qrSession, accountId, pin });

  const userInfo = res?.data?.userInfo;
  if (userInfo) {
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
  }

  const ecomRes = await getEcomAccessToken();
  const ecomToken = ecomRes?.data?.accessToken;
  if (ecomToken) {
    localStorage.setItem("ecomm_token", ecomToken);
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

  return userInfo;
}

export function logout() {
  // Clear POS session state so the next login (e.g. a different cashier on a
  // shared terminal) never inherits the previous user's cart/customer/register.
  resetPosState(store.dispatch);

  localStorage.removeItem("userInfo");
  localStorage.removeItem("ecomm_token");

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export { LOGIN_METHODS };
