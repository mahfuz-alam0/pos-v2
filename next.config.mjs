const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";
const isProd = process.env.NODE_ENV === "production";

process.env.NEXT_PUBLIC_TAURI = isTauri ? "1" : "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  ...(isProd ? { compiler: { removeConsole: true } } : {}),
  ...(isTauri ? { output: "standalone" } : {}),
};

export default nextConfig;
