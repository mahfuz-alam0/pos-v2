import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export const LOGIN_METHODS = {
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
  QR_CODE: "QR_CODE",
  PIN: "PIN",
};

export async function loginWithBackend({
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
  const isQr = method === LOGIN_METHODS.QR_CODE;
  const isPin = method === LOGIN_METHODS.PIN;

  const body = isQr
    ? { method, qrSession }
    : isPin
    ? { orgId, method, accountId, pin }
    : { orgId, email, password, method };

  try {
    const { data } = await api.post("/organization-accounts/multi-method-login", body);
    return data; // { success, data: { userInfo } } — session cookie set by server via Set-Cookie
  } catch (err) {
    handleApiError(err);
  }
}
