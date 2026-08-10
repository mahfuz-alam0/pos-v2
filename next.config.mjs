const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

process.env.NEXT_PUBLIC_TAURI = isTauri ? "1" : "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for the Tauri sidecar (.next/standalone/server.js).
  // Harmless for normal web deploys.
  output: "standalone",
  // `/proxy/*` is handled by src/proxy.ts, which also rewrites the upstream
  // `Set-Cookie` so WKWebView keeps it over http. A rewrites() entry can't do that.
};

export default nextConfig;
