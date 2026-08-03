export interface HardwareClient {
  _id: string;
  name: string;
  jobType: string;
  createdAt: string;
  deviceProps?: { deviceName?: string };
}

export const JOB_TYPES = [
  { id: "PACKAGE_LABEL", name: "Package Label" },
  { id: "EXIT_LABEL", name: "Exit Label" },
  { id: "RECEIPT", name: "Receipt" },
  { id: "DELIVERY_RECEIPT", name: "Delivery Receipt" },
  { id: "PRE_ORDER_FULFILLMENT_PULL_SHEET", name: "Pre Order Fulfillment Pull Sheet" },
];
