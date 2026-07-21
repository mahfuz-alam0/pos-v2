/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/pos/:path*",
        destination: `${process.env.NEXT_PUBLIC_BASE_URL}/:path*`,
      },
      {
        source: "/api/ecom/:path*",
        destination: `${process.env.NEXT_PUBLIC_ECCOMMERCE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
