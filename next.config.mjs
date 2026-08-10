const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

process.env.NEXT_PUBLIC_TAURI = isTauri ? "1" : "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for the Tauri sidecar (.next/standalone/server.js).
  // Only for that build — Vercel has its own native file-tracing/packaging for
  // Next.js deploys, and `output: "standalone"` conflicts with it (it changes
  // where the build writes .next/next-server.js.nft.json, which Vercel's own
  // packaging step then fails to find).
  ...(isTauri ? { output: "standalone" } : {}),
  // `/proxy/*` is handled by src/proxy.ts, which also rewrites the upstream
  // `Set-Cookie` so WKWebView keeps it over http. A rewrites() entry can't do that.
};

export default nextConfig;
