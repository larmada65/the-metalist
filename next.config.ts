import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['stripe'],
  experimental: {
    // Allow large audio uploads (e.g. m4a) through the storage-upload API (client → Next.js).
    proxyClientMaxBodySize: '26mb',
  },
};

export default nextConfig;
