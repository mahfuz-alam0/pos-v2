// Packs the Next.js standalone build + a Node binary into src-tauri/binaries/
// as a Tauri sidecar. Run after `next build`.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("Missing .next/standalone — run `next build` first.");
  process.exit(1);
}

// Tauri resolves sidecars by `<name>-<target-triple>` and strips the suffix when bundling.
// SIDECAR_TARGET overrides the host triple when cross-compiling (CI builds the
// Intel-Mac target from an ARM runner), where `rustc -vV` reports the wrong arch.
const triple =
  process.env.SIDECAR_TARGET ??
  execFileSync("rustc", ["-vV"], { encoding: "utf8" }).match(/^host: (.+)$/m)[1];

const outDir = join(root, "src-tauri", "binaries");
const serverDir = join(root, "src-tauri", "server");

rmSync(serverDir, { recursive: true, force: true });
// Wipe stale runtimes too — a leftover `node-<triple>` from an earlier build would
// otherwise still be bundled, adding ~112MB back to the app.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// server.js omits these two by design; copy them so the sidecar can serve assets.
cpSync(standalone, serverDir, { recursive: true });
cpSync(join(root, ".next", "static"), join(serverDir, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) {
  cpSync(join(root, "public"), join(serverDir, "public"), { recursive: true });
}

// sharp (a Next.js optional dep) ships one prebuilt binary per OS/arch. bun
// installs whichever matches the *host* running `bun install`, not the Rust
// cross-compile target — so cross-building x86_64 on an arm64 runner (or vice
// versa) bundles the wrong-arch .node/.dylib too. It's dead weight, and on
// macOS its bundled signature also fails Apple notarization outright.
if (triple.includes("-apple-darwin")) {
  const dropArch = triple.startsWith("x86_64") ? "arm64" : "x64";
  const imgDir = join(serverDir, "node_modules", "@img");
  if (existsSync(imgDir)) {
    for (const name of readdirSync(imgDir)) {
      if (name.includes(`-darwin-${dropArch}`)) {
        rmSync(join(imgDir, name), { recursive: true, force: true });
      }
    }
  }
}

// Watchdog wrapper must sit beside server.js so its relative import resolves.
cpSync(join(root, "scripts", "sidecar-entry.mjs"), join(serverDir, "sidecar-entry.mjs"));

// Server-only vars (PIXLAB_API_KEY) are read at runtime, not inlined at build time,
// so the env file has to ship with the server. Next loads it from the server cwd.
// NOTE: this puts the key inside the app bundle — readable by anyone with the app.
//
// Source is .env.local (the single env file this project keeps), but it lands as
// .env.production because server.js hardcodes NODE_ENV=production, and Next
// deliberately ignores .env.local in production builds.
const envFile = process.env.SIDECAR_ENV_FILE ?? ".env.local";
if (existsSync(join(root, envFile))) {
  cpSync(join(root, envFile), join(serverDir, ".env.production"));
  console.log(`Bundled env: ${envFile} -> server/.env.production`);
} else {
  console.warn(`No ${envFile} found — server-side env vars will be missing at runtime.`);
}

// ponytail: ship the local Bun binary rather than downloading a pinned one.
// Fine while dev and target arch match; pin a download if you ever cross-compile.
// Bun over Node purely for bundle size (~60MB vs ~112MB) — both run the Next.js
// standalone server fine, but Next targets Node officially, so bun compatibility
// is de-facto. If a Next upgrade breaks the sidecar at launch, swap "bun" back to
// "node" here and in tauri.conf.json `externalBin` + lib.rs `.sidecar()`.
// SIDECAR_BUN points at a pre-fetched binary for the target arch; CI sets it when
// cross-compiling, since the local `bun` is then the wrong architecture.
const runtimeSrc =
  process.env.SIDECAR_BUN ??
  execFileSync(process.platform === "win32" ? "where" : "which", ["bun"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")[0];

if (!existsSync(runtimeSrc)) {
  console.error(`Bun runtime not found: ${runtimeSrc}`);
  process.exit(1);
}

const runtimeBin = join(outDir, `bun-${triple}${process.platform === "win32" ? ".exe" : ""}`);
cpSync(runtimeSrc, runtimeBin);
chmodSync(runtimeBin, 0o755);

console.log(`Sidecar bun:   ${runtimeSrc} -> ${runtimeBin}`);
console.log(`Server files:  ${serverDir}`);
