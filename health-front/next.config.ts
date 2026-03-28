import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keeps standalone layout flat when a parent directory has another lockfile (monorepo / home folder).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
