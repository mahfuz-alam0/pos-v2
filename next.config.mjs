const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ECOM_URL = process.env.NEXT_PUBLIC_ECCOMMERCE_URL;

const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

process.env.NEXT_PUBLIC_TAURI = isTauri ? "1" : "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server bundle for the Tauri sidecar (.next/standalone/server.js).
  // Harmless for normal web deploys.
  output: "standalone",
 
  ...(isTauri && {
    rewrites() {
      return [
        { source: "/proxy/ecom/:path*", destination: `${ECOM_URL}/:path*` },
        { source: "/proxy/:path*", destination: `${BASE_URL}/:path*` },
      ];
    },
  }),
};

export default nextConfig;
