// PATH: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⛳ GEEN basePath meer
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      // Checkout: /success -> /bedankt
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

  // ⛳ GEEN rewrites nodig
};

export default nextConfig;
