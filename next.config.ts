import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The forex-only ROI model became the Forex division of the suite ROI calculator.
  async redirects() {
    return [{ source: "/roi/forex", destination: "/roi", permanent: true }];
  },
};

export default nextConfig;
