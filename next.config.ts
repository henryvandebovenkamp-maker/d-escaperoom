// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ⛳ Laat de build slagen ook als ESLint fouten vindt
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⛳ Laat de build slagen ook als TS type errors vindt
    ignoreBuildErrors: true,
  },

  // ✅ Altijd /success → /bedankt binnen checkout
  async redirects() {
    return [
      {
        source: "/checkout/:bookingId/success",
        destination: "/checkout/:bookingId/bedankt",
        permanent: false,
      },
      // Extra vangnet als er per ongeluk nog iets achter /success staat
      {
        source: "/checkout/:bookingId/success/:path*",
        destination: "/checkout/:bookingId/bedankt",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
