import type { NextConfig } from "next";

// PAGES_BUILD=1 → fully static `out/` directory for GitHub Pages (custom
// domain, so no basePath is needed). Default stays `standalone` for the
// Docker/VPS flow, where middleware CSP nonces keep working.
const nextConfig: NextConfig = {
  output: process.env.PAGES_BUILD ? "export" : "standalone",
};

export default nextConfig;
