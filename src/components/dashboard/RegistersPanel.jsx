"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useShop } from "@/context/shop-context";
import { fetchRegistersList } from "@/services/registers/list";
import { enableRegister, disableRegister } from "@/services/registers/toggleRegister";

export default function RegistersPanel() {
  const { shopId } = useShop();
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRegisters = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchRegistersList(shopId);
      setRegisters(res?.data?.data?.registers || []);
    } catch (err) {
      console.error("Error fetching registers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleToggle = async (register) => {
    const body = { shopId, id: register.id, version: register.version };
    try {
      if (register.isOpen) {
        await disableRegister(body);
      } else {
        await enableRegister(body);
      }
      fetchRegisters();
    } catch (err) {
      console.error("Failed to toggle register:", err);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-component-bg p-4">
      <h2 className="m-0 text-[18px] font-semibold text-text">Registers</h2>
      <div className="mt-3 border-t border-border" />

      {loading ? (
        <div className="py-6 text-center text-muted-foreground">Loading…</div>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 text-center font-medium">Status</th>
              <th className="pb-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {registers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-muted-foreground">
                  No Data Found
                </td>
              </tr>
            ) : (
              registers.map((register) => (
                <tr key={register.id} className="border-t border-border">
                  <td className="py-2.5">{register.name}</td>
                  <td className="py-2.5 text-center">
                    <button
                      role="switch"
                      aria-checked={Boolean(register.isOpen)}
                      onClick={() => handleToggle(register)}
                      className={`relative mx-auto flex h-4.5 w-8 items-center rounded-full transition-colors ${
                        register.isOpen ? "bg-primary" : "bg-surface-alt"
                      }`}
                    >
                      <span
                        className={`size-3.5 rounded-full bg-white shadow transition-transform ${
                          register.isOpen ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-2.5 text-center">
                    <ChevronRight className="mx-auto size-4 cursor-pointer" style={{ color: register.isOpen ? "#2A9D8F" : "#E76F51" }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
