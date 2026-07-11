import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output => tiny, portable Docker image for self-hosting later.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
