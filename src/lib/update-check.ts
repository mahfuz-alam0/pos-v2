"use client";

// Auto-update check for the Tauri desktop build. Runs at most once per 24h,
// gated by a timestamp in localStorage so repeated launches the same day make
// no network request at all. In the browser build this is a no-op.

const LAST_CHECK_KEY = "pos-last-update-check";
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function checkForUpdates(force = false): Promise<void> {
  if (!isTauriDesktop()) return; // browser build — nothing to do

  const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
  if (!force && Date.now() - last < INTERVAL_MS) return; // already checked today
  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

  try {
    const [{ check }, { relaunch }] = await Promise.all([
      import("@tauri-apps/plugin-updater"),
      import("@tauri-apps/plugin-process"),
    ]);
    const update = await check();
    if (update?.available) {
      await update.downloadAndInstall();
      await relaunch();
    }
  } catch {
    // Network/parse errors are transient — skip silently, retry next launch.
  }
}
