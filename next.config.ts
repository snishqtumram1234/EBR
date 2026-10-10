import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside a dev server without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // Design photos never change under the same name: let browsers keep them.
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
