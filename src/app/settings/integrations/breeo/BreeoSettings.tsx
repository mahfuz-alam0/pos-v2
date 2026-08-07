"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, X } from "lucide-react";

import { getBreeoConfig } from "@/services/breeo/getConfig";
import { createBreeoConfig } from "@/services/breeo/createConfig";
import { toggleBreeoStatus } from "@/services/breeo/toggleStatus";
import { fetchRegistersList } from "@/services/registers/list";

import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Terminal = { registerId: string | undefined; terminalAccessKey: string };
type Register = { id: string; name: string };

const emptyTerminal = (): Terminal => ({ registerId: undefined, terminalAccessKey: "" });

export default function BreeoSettings({
  open,
  onClose,
  onSaved,
  onStatusToggle,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onStatusToggle?: (active: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [configExists, setConfigExists] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [posAccessKey, setPosAccessKey] = useState("");
  const [terminals, setTerminals] = useState<Terminal[]>([emptyTerminal()]);
  const [registers, setRegisters] = useState<Register[]>([]);

  useEffect(() => {
    if (!open) return;
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");

    fetchRegistersList(shopId, { limit: 100 }).then((res) => {
      setRegisters(res?.data?.data?.registers ?? []);
    });

    setInitialLoading(true);
    getBreeoConfig()
      .then((res) => {
        const config = res?.data?.data;
        if (!config) return;
        setConfigExists(true);
        setIsActive(!!config.isActive);
        setPosAccessKey(config.posAccessKey || "");
        setTerminals(
          config.terminals?.length
            ? config.terminals.map((t: any) => ({ registerId: t.registerId, terminalAccessKey: t.terminalAccessKey }))
            : [emptyTerminal()]
        );
      })
      .finally(() => setInitialLoading(false));
  }, [open]);

  const updateTerminal = (index: number, field: keyof Terminal, value: string) => {
    setTerminals((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTerminal = () => setTerminals((prev) => [...prev, emptyTerminal()]);
  const removeTerminal = (index: number) => setTerminals((prev) => prev.filter((_, i) => i !== index));

  const getValidTerminals = () => terminals.filter((t) => t.registerId && t.terminalAccessKey.trim());

  const handleToggleActive = async (checked: boolean) => {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    setIsActive(checked);
    try {
      await toggleBreeoStatus({ shopId, activate: checked });
      toast.success(checked ? "Bleaum Digital Pay activated." : "Bleaum Digital Pay deactivated.");
      onStatusToggle?.(checked);
    } catch (err: any) {
      setIsActive(!checked);
      toast.error(err?.message || "Failed to update status.");
    }
  };

  const handleSubmit = async () => {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const validTerminals = getValidTerminals();

    if (!posAccessKey.trim()) {
      toast.error("POS Access Key is required.");
      return;
    }
    if (validTerminals.length === 0) {
      toast.error("Add at least one register with a Terminal Access Key.");
      return;
    }
    const registerIds = validTerminals.map((t) => t.registerId);
    if (new Set(registerIds).size !== registerIds.length) {
      toast.error("Each register can only be mapped to one terminal.");
      return;
    }

    setLoading(true);
    try {
      await createBreeoConfig({ shopId, posAccessKey: posAccessKey.trim(), terminals: validTerminals });
      toast.success("Bleaum Digital Pay configuration saved successfully!");
      if (!configExists) {
        setConfigExists(true);
        setIsActive(true);
      }
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Bleaum Digital Pay configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={loading ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Bleaum Digital Pay Integration</div>
            <div className="text-xs leading-tight text-muted-foreground">Cashless ATM payments at your registers</div>
          </div>
          {configExists && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{isActive ? "Active" : "Inactive"}</span>
              <Switch checked={isActive} onCheckedChange={handleToggleActive} />
            </div>
          )}
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Configure your Bleaum Digital Pay POS Access Key, then map each register to its terminal, to accept cashless ATM payments
            at checkout.
          </p>

          {!initialLoading && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pos-access-key">POS Access Key</Label>
                <Input
                  id="pos-access-key"
                  placeholder="Enter your Bleaum Digital Pay POS Access Key"
                  value={posAccessKey}
                  onChange={(e) => setPosAccessKey(e.target.value)}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Register → Terminal Mapping</p>
                <div className="flex flex-col gap-3">
                  {terminals.map((terminal, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        {index === 0 && <Label>Register</Label>}
                        <Select
                          items={registers.map((r) => ({ value: r.id, label: r.name }))}
                          value={terminal.registerId}
                          onValueChange={(v) => updateTerminal(index, "registerId", v as string)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Register" />
                          </SelectTrigger>
                          <SelectContent>
                            {registers.map((register) => (
                              <SelectItem key={register.id} value={register.id}>
                                {register.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-1 flex-col gap-1.5">
                        {index === 0 && <Label>Terminal Access Key</Label>}
                        <Input
                          placeholder="Enter Terminal Access Key"
                          value={terminal.terminalAccessKey}
                          onChange={(e) => updateTerminal(index, "terminalAccessKey", e.target.value)}
                        />
                      </div>

                      <Button variant="ghost" size="icon" disabled={terminals.length === 1} onClick={() => removeTerminal(index)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="mt-3" onClick={addTerminal}>
                  <Plus className="size-3.5" /> Add Register
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || initialLoading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
