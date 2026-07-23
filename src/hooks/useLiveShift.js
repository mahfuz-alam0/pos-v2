"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMyLiveShift } from "@/services/employees/shift/myLiveShift";
import { startLiveShift } from "@/services/employees/shift/startLive";
import { endLiveShift } from "@/services/employees/shift/endLive";

export function useLiveShift() {
  const [liveShiftData, setLiveShiftData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyLiveShift();
      setLiveShiftData(res?.data?.shift ?? null);
    } catch (err) {
      setError(err.message || "Failed to fetch live shift data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    const shopId = localStorage.getItem("shopId");
    if (userInfo && shopId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startShift = useCallback(async (pin) => {
    setStarting(true);
    setError(null);
    try {
      await startLiveShift(pin);
      const res = await fetchMyLiveShift();
      setLiveShiftData(res?.data?.shift ?? null);
      return true;
    } catch (err) {
      setError(err.message || "Failed to start shift");
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  const endShift = useCallback(async (pin) => {
    setEnding(true);
    setError(null);
    try {
      await endLiveShift(pin);
      setLiveShiftData(null);
      return true;
    } catch (err) {
      setError(err.message || "Failed to end shift");
      return false;
    } finally {
      setEnding(false);
    }
  }, []);

  return {
    liveShiftData,
    loading,
    starting,
    ending,
    error,
    clearError: () => setError(null),
    refresh,
    startShift,
    endShift,
  };
}
