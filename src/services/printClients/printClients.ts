import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPrintClients(shopId, jobType) {
  try {
    const { data } = await api.get("/hardware-client/web-admin/list-all-print-clients", {
      params: { shopId, jobType },
    });
    return data?.data || [];
  } catch (err) {
    handleApiError(err);
  }
}

export async function getUserPrintPreference(shopId, printTemplateType) {
  try {
    const { data } = await api.get("/user-print-preference/get-preference", {
      params: { shopId, printTemplateType },
    });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function setUserPrintPreference({ shopId, printTemplateType, setUpId, sessionId }) {
  try {
    const { data } = await api.post("/user-print-preference/set-preference", {
      shopId,
      printTemplateType,
      setUpId,
      sessionId,
    });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteUserPrintPreference(shopId, printTemplateType) {
  try {
    const { data } = await api.delete("/user-print-preference/delete-preference", {
      params: { shopId, printTemplateType },
    });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function createPrintJob(body) {
  try {
    const { data } = await api.post("/hardware-client/web-admin/create-print-job", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
