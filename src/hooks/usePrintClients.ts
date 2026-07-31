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
