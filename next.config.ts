import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output for the zipped release artifact:
  // `.next/standalone/server.js` runs with `node server.js`, no install.
  output: "standalone",
};

export default nextConfig;
