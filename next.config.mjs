/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for the Tauri sidecar (.next/standalone/server.js).
  // Harmless for normal web deploys.
  output: "standalone",
};

export default nextConfig;
