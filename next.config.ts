import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output => tiny, portable Docker image for self-hosting later.
  output: "standalone",
};

export default nextConfig;
