import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components (PPR-by-default) is intentionally disabled: PropertyLens is a
  // predominantly dynamic, auth-gated, per-request application (live usage ledgers,
  // SSE research progress, user-owned data). Standard dynamic rendering is the
  // better-understood, lower-risk default for this build. See docs/architecture/adr-0002-nextjs-rendering-mode.md.
  cacheComponents: false,
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
