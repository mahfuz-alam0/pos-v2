#!/usr/bin/env node
// One-command environment bootstrap for Tauri dev/build.
//
// Runs before `tauri dev` and `tauri build`. Ensures the two things a fresh
// clone (or new machine) always misses:
//   - Rust toolchain (cargo/rustc), installed via rustup when absent.
//   - The Bun runtime, needed both by `next build`-less dev and the sidecar
//     packaging step. Installed via the official installer when absent.
//
// The sidecar binary and `src-tauri/server/` are gitignored build artifacts.
// Dev mode needs the binary present before `tauri dev` spawns the shell plugin
// sidecar; the server dir is only produced by `next build` (build:sidecar), so
// a plain `bun dev` clone doesn't have it yet — we stub it and let the build
// regenerate it. That keeps `bun run tauri:dev` working on a cold checkout.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

const root = process.cwd();
const binariesDir = join(root, "src-tauri", "binaries");
const serverDir = join(root, "src-tauri", "server");

const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const info = (msg) => console.log(`  \x1b[36m→\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`  \x1b[33m!\x1b[0m ${msg}`);

const which = (bin) => {
  try {
    return execSync(process.platform === "win32" ? `where ${bin}` : `which ${bin}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")[0];
  } catch {
    return "";
  }
};

const has = (bin) => which(bin) !== "";

// Freshly installed toolchains land in known dirs that the *current* process's
// PATH predates; add them so the checks below see them without a shell restart.
const addToPath = (dir) => {
  if (existsSync(dir) && !process.env.PATH.split(":").includes(dir)) {
    process.env.PATH = `${dir}:${process.env.PATH}`;
  }
};

// Sidecar naming: `<name>-<target-triple>`, same as scripts/build-sidecar.mjs.
const rustHost = () => {
  try {
    return execSync("rustc -vV", { encoding: "utf8" })
      .match(/^host: (.+)$/m)?.[1]
      .trim();
  } catch {
    return "";
  }
};

const expectedSidecar = () => {
  const triple = process.env.SIDECAR_TARGET ?? rustHost();
  if (!triple) return "";
  return join(binariesDir, `bun-${triple}${platform() === "win32" ? ".exe" : ""}`);
};

console.log("\n\x1b[1mTauri environment check\x1b[0m");

// --- Rust toolchain -------------------------------------------------------
if (has("cargo") && has("rustc")) {
  ok(`Rust toolchain (${rustHost()})`);
} else {
  warn("Rust not found — installing via rustup.");
  info("This downloads and installs Rust; may take a few minutes.");
  if (platform() === "win32") {
    // rustup-init.exe is the official Windows route.
    console.log("  Downloading rustup-init.exe...");
    execSync(
      'powershell -Command "Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile $env:TEMP\\rustup-init.exe"',
      { stdio: "inherit" }
    );
    execSync(`"${process.env.TEMP}\\rustup-init.exe" -y --profile minimal`, { stdio: "inherit" });
  } else {
    console.log("  Downloading rustup-init.sh...");
    execSync('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal', {
      stdio: "inherit",
    });
  }
  addToPath(join(homedir(), ".cargo", "bin"));
  if (!has("cargo") && !has("rustc")) {
    warn("Rust installed but not on PATH. Restart your shell, or run `source ~/.cargo/env` first.");
  } else {
    ok("Rust toolchain");
  }
}

// --- Bun runtime ----------------------------------------------------------
if (has("bun")) {
  ok(`Bun (${which("bun")})`);
} else {
  warn("Bun not found — installing via the official installer.");
  info("The build scripts use `bun run` and the sidecar bundles the bun binary.");
  const installer =
    platform() === "win32" ? "powershell -c \"irm bun.sh/install.ps1 | iex\"" : "curl -fsSL https://bun.sh/install | bash";
  execSync(installer, { stdio: "inherit" });
  addToPath(join(homedir(), ".bun", "bin"));
  if (!has("bun")) {
    warn("Bun installed but not on PATH. Restart your shell, or run `source ~/.bun/bin` first.");
  } else {
    ok("Bun");
  }
}

// --- Sidecar / server dirs (dev-mode prerequisites) -----------------------
// `externalBin` is resolved by the Tauri build script itself, so a fresh clone
// fails to compile *before* build:sidecar ever runs. Placing the local bun here
// is exactly what build-sidecar.mjs does; that step later overwrites it.
const sidecar = expectedSidecar();
if (!sidecar) {
  warn("Cannot resolve the sidecar binary name (is rustc on PATH?)");
  info("Restart your shell (or `source ~/.cargo/env`) and re-run.");
} else if (existsSync(sidecar)) {
  ok(`Sidecar bun binary (${sidecar.replace(root, ".")})`);
} else {
  const src = process.env.SIDECAR_BUN ?? which("bun");
  if (src && existsSync(src)) {
    mkdirSync(binariesDir, { recursive: true });
    copyFileSync(src, sidecar);
    chmodSync(sidecar, 0o755);
    ok(`Sidecar bun binary created (${src} -> ${sidecar.replace(root, ".")})`);
  } else {
    warn(`Missing sidecar binary: ${sidecar.replace(root, ".")} — bun not on PATH to copy from.`);
    info("Restart your shell so `bun` resolves, then re-run.");
  }
}

// The server dir is regenerated by every `next build` (build:sidecar); a stub
// keeps `tauri dev` from breaking when only `next dev` has ever run.
if (existsSync(join(serverDir, "server.js"))) {
  ok(`Server bundle (${serverDir.replace(root, ".")})`);
} else {
  warn(`Missing server bundle (${serverDir.replace(root, ".")}) — stubbing; build:sidecar will regenerate it.`);
  mkdirSync(serverDir, { recursive: true });
}

console.log("");
