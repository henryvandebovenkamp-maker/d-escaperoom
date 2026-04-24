// PATH: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      {
        source: "/checkout/:bookingId/success",
        destination: "/checkout/:bookingId/bedankt",
        permanent: false,
      },
      {
        source: "/checkout/:bookingId/success/:path*",
        destination: "/checkout/:bookingId/bedankt",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;