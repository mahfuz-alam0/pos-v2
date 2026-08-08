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
    const orgScopes = userInfo?.orgFeatureScopes || [];
    const isCaliforniaState = orgScopes.includes("METRC_CALI") || orgScopes.includes("METRC_CA");
    localStorage.setItem("isCaliforniaState", isCaliforniaState ? "true" : "false");
  }

  const ecomRes = await getEcomAccessToken();
  const ecomToken = ecomRes?.data?.accessToken;
  if (ecomToken) {
    localStorage.setItem("ecomm_token", ecomToken);
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

  return userInfo;
}

// Everything tied to the user or their org, cleared on logout so the next cashier
// on a shared terminal starts clean. Cart/register/shop keys are not here — those
// belong to resetPosState, which logout also calls.
//
// Deliberately NOT cleared: device preferences that outlive any user
// (`pos-theme`, `pos-mode`, `pos-theme-custom`, `pos-layout-type`,
// `sidebarCollapsed`, `settingsFabTop`, `bleaum_print_configs`,
// `printer_preference_*`), and `pos-remember`, which is the opt-in
// "remember me" store — wiping it would defeat the feature.
const USER_SCOPED_KEYS = [
  "userInfo",
  "ecomm_token",
  "chatToken",
  "shopDetails",
  "customizeSettings",
  "isCaliforniaState",
  "measurementPolicy",
  "shouldSegmentCustomersBasedOnShopScopes",
  "shareMode",
  "preferredUserIds",
  "registerName",
  "drawerName",
  // Written by the previous app version; cleared so a stale value can't leak
  // across users on terminals upgraded in place.
  "locationShopId",
];

export function logout() {
  // Clear POS session state so the next login (e.g. a different cashier on a
  // shared terminal) never inherits the previous user's cart/customer/register.
  resetPosState(store.dispatch);

  USER_SCOPED_KEYS.forEach((key) => localStorage.removeItem(key));

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export { LOGIN_METHODS };
