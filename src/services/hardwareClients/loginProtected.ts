import { api } from "@/services/api";

// Logs this device into the hardware-client relay in the background so paired
// local/remote printers are available without a separate sign-in step. Deliberately
// does not use handleApiError — a 401 here must not trigger the shared logout(),
// since this login is independent of (and must never affect) the POS session.
export async function hardwareClientLoginProtected({ orgUsername, email, password }) {
  try {
    const { data } = await api.post("/hardware-client/login-protected", {
      orgUsername,
      email,
      password,
    });
    return data;
  } catch (err) {
    console.warn("Hardware-client background login failed", err);
    return null;
  }
}
