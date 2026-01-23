// PATH: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⛳ GEEN basePath meer

  // Let op: eslint-config hoort niet meer in next.config
  // ESLint regel je via eslint.config.mjs

  // (optioneel) tijdelijk toegestaan tijdens development
  typescript: {
    ignoreBuildErrors: true,
  },

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
