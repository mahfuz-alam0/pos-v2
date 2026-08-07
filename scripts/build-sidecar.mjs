// Packs the Next.js standalone build + a Node binary into src-tauri/binaries/
// as a Tauri sidecar. Run after `next build`.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("Missing .next/standalone — run `next build` first.");
  process.exit(1);
}

// Tauri resolves sidecars by `<name>-<target-triple>` and strips the suffix when bundling.
const triple = execFileSync("rustc", ["-vV"], { encoding: "utf8" })
  .match(/^host: (.+)$/m)[1];

const outDir = join(root, "src-tauri", "binaries");
const serverDir = join(root, "src-tauri", "server");

rmSync(serverDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// server.js omits these two by design; copy them so the sidecar can serve assets.
cpSync(standalone, serverDir, { recursive: true });
cpSync(join(root, ".next", "static"), join(serverDir, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) {
  cpSync(join(root, "public"), join(serverDir, "public"), { recursive: true });
}

// Watchdog wrapper must sit beside server.js so its relative import resolves.
cpSync(join(root, "scripts", "sidecar-entry.mjs"), join(serverDir, "sidecar-entry.mjs"));

// Server-only vars (PIXLAB_API_KEY) are read at runtime, not inlined at build time,
// so the env file has to ship with the server. Next loads it from the server cwd.
// NOTE: this puts the key inside the app bundle — readable by anyone with the app.
const envFile = process.env.SIDECAR_ENV_FILE ?? ".env.production";
if (existsSync(join(root, envFile))) {
  cpSync(join(root, envFile), join(serverDir, ".env.production"));
  console.log(`Bundled env: ${envFile}`);
} else {
  console.warn(`No ${envFile} found — server-side env vars will be missing at runtime.`);
}

// ponytail: ship the local Node binary rather than downloading a pinned one.
// Fine while dev and target arch match; pin a download if you ever cross-compile.
// Resolved via `which` because this script runs under bun, where process.execPath
// is the bun binary — the sidecar must be Node, which is what Next.js targets.
const nodeSrc = execFileSync(process.platform === "win32" ? "where" : "which", ["node"], {
  encoding: "utf8",
}).trim().split("\n")[0];

const nodeBin = join(outDir, `node-${triple}${process.platform === "win32" ? ".exe" : ""}`);
cpSync(nodeSrc, nodeBin);
chmodSync(nodeBin, 0o755);

console.log(`Sidecar node:  ${nodeSrc} -> ${nodeBin}`);
console.log(`Server files:  ${serverDir}`);
