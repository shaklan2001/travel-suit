import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The forex-only ROI model became the Forex division of the suite ROI calculator.
      { source: "/roi/forex", destination: "/roi", permanent: true },
      // Pre-tour, in-tour, and completion became one Tour care module.
      { source: "/:old(prebook|during|post)/:rest*", destination: "/care/:rest*", permanent: true },
      // Airlines and hotels became one Reservations module.
      { source: "/:old(airlines|hotels)/:rest*", destination: "/reservations/:rest*", permanent: true },
    ];
  },
};

export default nextConfig;
