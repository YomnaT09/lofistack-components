import type { NextConfig } from "next";

// Static export so the site can be hosted on GitHub Pages (served under /lofistack-components).
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isPages ? { basePath: "/lofistack-components", assetPrefix: "/lofistack-components/" } : {}),
};

export default nextConfig;
