import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export const LOGIN_METHODS = {
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
  QR_CODE: "QR_CODE",
};

export async function loginWithBackend({
  orgId,
  email,
  password,
  method,
  qrSession,
}: {
  orgId?: string
  email?: string
  password?: string
  method: string
  qrSession?: string
}) {
  const isQr = method === LOGIN_METHODS.QR_CODE;

  const body = isQr ? { method, qrSession } : { orgId, email, password, method };

  try {
    const { data } = await api.post("/organization-accounts/multi-method-login", body);
    return data; // { success, data: { userInfo } } — session cookie set by server via Set-Cookie
  } catch (err) {
    handleApiError(err);
  }
}
