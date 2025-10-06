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
  // (optioneel) zet images domains hier als je later externe images gebruikt
  // images: { remotePatterns: [{ protocol: 'https', hostname: '...' }] },
};

export default nextConfig;
