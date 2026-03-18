declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAConfig = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    [key: string]: unknown;
  };

  export default function nextPwa(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}

