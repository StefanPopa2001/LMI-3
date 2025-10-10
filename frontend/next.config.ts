import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Serve the app under a sub-path so Traefik can reverse-proxy to /lmi3
  basePath: '/lmi3',
  assetPrefix: '/lmi3',
};

export default nextConfig;
