// PATH: next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// Koppel next-intl aan jouw config-bestand
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ⛳ GEEN basePath
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

export default withNextIntl(nextConfig);
