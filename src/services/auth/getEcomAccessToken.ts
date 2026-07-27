import { ecomApiExternal } from "@/services/api";

export async function getEcomAccessToken() {
  try {
    const { data } = await ecomApiExternal.get("/ecomm-auth/get-access-token");
    return data; // { success, data: { accessToken } }
  } catch (err) {
    // Non-fatal: e-commerce token is a secondary concern and must not block sign-in redirect.
    console.warn("Failed to fetch e-commerce access token", err);
    return null;
  }
}
