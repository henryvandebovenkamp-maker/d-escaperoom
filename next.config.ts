// PATH: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hele site onder /nl
  basePath: "/nl",

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [
      // Root -> /nl (extern; voorkom loop met basePath: false)
      {
        source: "/",
        destination: "/nl",
        permanent: true,
        basePath: false,
      },
      // Alles wat niet met /nl/ begint -> naar /nl/... (laat assets/SEO files met rust)
      {
        source:
          "/:path((?!nl/|api/|_next/|favicon\\.ico|robots\\.txt|sitemap\\.xml|sitemap-.*\\.xml|manifest\\.json|site\\.webmanifest|apple-touch-icon\\.png|images/|fonts/|static/|assets/).*)",
        destination: "/nl/:path",
        permanent: true,
        basePath: false,
      },

      // ✅ Checkout: /success -> /bedankt (binnen basePath)
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

  async rewrites() {
    return [
      // Oude webhooks/clients die /api/... zonder /nl aanroepen blijven werken
      { source: "/api/:path*", destination: "/nl/api/:path*", basePath: false },
    ];
  },
};

export default nextConfig;
