import { isTauriDesktop } from "@/lib/update-check";

export interface LocalPrinter {
  name: string;
  status: "idle" | "printing" | "disabled" | "unknown";
  isDefault: boolean;
}

interface RawLocalPrinter {
  name: string;
  status: string;
  is_default: boolean;
}

// Real OS printer enumeration (list_local_printers in src-tauri/src/lib.rs,
// shelling out to `lpstat` on macOS/Linux or Win32_Printer via PowerShell on
// Windows) only exists in the Tauri desktop build — browsers have no API to
// list system printers at all, so this resolves to an empty list there.
export async function listLocalPrinters(): Promise<LocalPrinter[]> {
  if (!isTauriDesktop()) return [];

  const { invoke } = await import("@tauri-apps/api/core");
  const printers = await invoke<RawLocalPrinter[]>("list_local_printers");
  return printers.map((p) => ({ name: p.name, status: p.status as LocalPrinter["status"], isDefault: p.is_default }));
}
