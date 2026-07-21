const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const LOGIN_METHODS = {
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
  QR_CODE: "QR_CODE",
};

export async function loginWithBackend({ orgId, email, password, method, qrSession }) {
  const isQr = method === LOGIN_METHODS.QR_CODE;

  const url = isQr
    ? `${API_URL}/v1/organization-accounts/multi-method-login`
    : `${API_URL}/organization-accounts/multi-method-login`;

  const body = isQr ? { method, qrSession } : { orgId, email, password, method };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Login failed");
  }

  return res.json(); // expected: { token, user, shops, ... }
}
