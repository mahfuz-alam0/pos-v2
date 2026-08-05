"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <div className="rounded-xl bg-component-bg shadow-md">
      <div className="border-b border-border px-4 py-5.5">
        <h2 className="m-0 text-lg font-normal text-text">Registers</h2>
      </div>

      {loading ? (
        <div className="p-3 py-6 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="px-1 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs text-muted-foreground">
                <th className="rounded-l-lg py-2.5 pl-3 font-medium">Name</th>
                <th className="py-2.5 text-center font-medium">Status</th>
                <th className="rounded-r-lg py-2.5 pr-3 text-center font-medium">Action</th>
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
                    <td className="py-6">{register.name}</td>
                    <td className="py-6 text-center">
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
                    <td className="py-6 text-center">
                      <Link
                        href={`/pos/drawers?registerId=${register.id}`}
                        className="mx-auto flex size-6 items-center justify-center rounded-full border"
                        style={{ borderColor: register.isOpen ? "#2A9D8F" : "#E76F51" }}
                      >
                        <ChevronRight className="size-4" style={{ color: register.isOpen ? "#2A9D8F" : "#E76F51" }} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
