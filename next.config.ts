import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // In dev, each logged request is written to .next/dev/logs, which triggers a rebuild,
  // which reloads any page rendered on demand, which logs another request: an endless
  // reload loop on routes like /issues/[id]. Request logs are off to break it.
  logging: { incomingRequests: false },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
