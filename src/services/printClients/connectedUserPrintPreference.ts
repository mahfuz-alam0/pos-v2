import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Local-tab printer preference: the browser/OS itself is the print target
// (no hardware-client relay/socket involved), so the preference stores raw
// device properties directly instead of referencing a registered client's
// setUpId/sessionId the way /user-print-preference (used by the Remote tab,
// see printClients.ts) does. Kept in its own file so the Remote tab's
// service is untouched.
export type ConnectedPrintJobType =
  | "PACKAGE_LABEL"
  | "EXIT_LABEL"
  | "RECEIPT"
  | "DELIVERY_RECEIPT"
  | "PRE_ORDER_FULFILLMENT_PULL_SHEET"
  | "OTHER";

export interface ConnectedDeviceProps {
  ipAddress?: string | null;
  deviceName?: string | null;
  port?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface ConnectedUserPrintPreference {
  _id?: string;
  shopId: string;
  jobType: ConnectedPrintJobType;
  deviceProps?: ConnectedDeviceProps | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SetConnectedUserPrintPreferencePayload {
  shopId: string;
  jobType: ConnectedPrintJobType;
  deviceProps: ConnectedDeviceProps;
}

// Response envelope is assumed to match every other preference endpoint in
// this codebase ({ success, data }) — the swagger doc didn't include a
// response schema, so double check against a live call if this is wrong.
export interface ConnectedUserPrintPreferenceResponse {
  success: boolean;
  data: ConnectedUserPrintPreference | null;
}

export async function setConnectedUserPrintPreference(payload: SetConnectedUserPrintPreferencePayload) {
  try {
    const { data } = await api.post<ConnectedUserPrintPreferenceResponse>(
      "/connected-user-print-preference/set-preference",
      payload
    );
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function getConnectedUserPrintPreference(shopId: string, jobType: ConnectedPrintJobType) {
  try {
    const { data } = await api.get<ConnectedUserPrintPreferenceResponse>(
      "/connected-user-print-preference/get-preference",
      { params: { shopId, jobType } }
    );
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteConnectedUserPrintPreference(shopId: string, jobType: ConnectedPrintJobType) {
  try {
    const { data } = await api.delete<ConnectedUserPrintPreferenceResponse>(
      "/connected-user-print-preference/delete-preference",
      { params: { shopId, jobType } }
    );
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
