"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPrintClients, setUserPrintPreference } from "@/services/printClients/printClients";

export const JOB_TYPES = {
  PACKAGE_LABEL: "PACKAGE_LABEL",
  EXIT_LABEL: "EXIT_LABEL",
  RECEIPT: "RECEIPT",
  DELIVERY_RECEIPT: "DELIVERY_RECEIPT",
  PRE_ORDER_FULFILLMENT_PULL_SHEET: "PRE_ORDER_FULFILLMENT_PULL_SHEET",
  OTHER: "OTHER",
};

// Full display name, used in toasts/messages where space isn't constrained.
export const JOB_TYPE_NAMES = {
  PACKAGE_LABEL: "Package Label",
  EXIT_LABEL: "Exit Label",
  RECEIPT: "Receipt",
  DELIVERY_RECEIPT: "Delivery Receipt",
  PRE_ORDER_FULFILLMENT_PULL_SHEET: "Pre-order Fulfillment Pull Sheet",
  OTHER: "Other",
};

export function getJobTypeLabel(jobType) {
  return JOB_TYPE_NAMES[jobType] || jobType.replace(/_/g, " ");
}

// Shortened label for tab strips (Local/Remote panels share this so both
// tab bars render identical text and line up at the same width).
export function getJobTypeTabLabel(jobType) {
  if (jobType === JOB_TYPES.PRE_ORDER_FULFILLMENT_PULL_SHEET) return "Pre-order";
  return getJobTypeLabel(jobType);
}

export function usePrintClients(shopId, jobType) {
  const [printClients, setPrintClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shopId || !jobType) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrintClients(shopId, jobType)
      .then((clients) => {
        if (!cancelled) setPrintClients(clients || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to fetch print clients");
          setPrintClients([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, jobType]);

  const setUserPreference = useCallback(
    async (setUpId, sessionId) => {
      const res = await setUserPrintPreference({ shopId, printTemplateType: jobType, setUpId, sessionId });
      const printer = printClients.find((p) => p._id === setUpId);
      localStorage.setItem(
        `printer_preference_${jobType}`,
        JSON.stringify({
          setupId: setUpId,
          sessionId,
          name: printer?.name || "Selected Printer",
          savedAt: new Date().toISOString(),
        })
      );
      return res;
    },
    [shopId, jobType, printClients]
  );

  return { printClients, loading, error, setUserPreference };
}
