import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Serve the app under a sub-path so Traefik can reverse-proxy to /LMI3/Webapp
  basePath: '/LMI3/Webapp',
  assetPrefix: '/LMI3/Webapp',
};

export default nextConfig;
