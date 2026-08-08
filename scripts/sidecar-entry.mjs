// Sidecar entrypoint: starts the Next.js standalone server and exits with the
// parent Tauri process. Without this, a hard-killed app (SIGKILL, crash) leaves
// an orphaned server holding the port.
const parentPid = Number(process.env.TAURI_PARENT_PID);

if (parentPid) {
  setInterval(() => {
    try {
      // Signal 0 checks existence without delivering anything.
      process.kill(parentPid, 0);
    } catch {
      process.exit(0);
    }
  }, 2000).unref();
}

await import("./server.js");
