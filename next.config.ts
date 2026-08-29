import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  // lighthouse/chrome-launcher use import.meta and dynamic requires that
  // webpack can't statically bundle; keep them as real Node requires
  // instead of trying to trace and inline them.
  serverExternalPackages: ["lighthouse", "chrome-launcher"],
};

export default nextConfig;
