import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export — deploys to GitHub Pages (or any static host).
  // Dev server (`next dev`) works exactly as before.
  output: "export",
  // Set at build time for GitHub Pages project sites: NEXT_PUBLIC_BASE_PATH=/<repo-name>
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
  // dev-only: silence the cross-origin warning when the sandbox preview panel
  // proxies the dev server through a different hostname (no effect on build)
  allowedDevOrigins: ["*.space-z.ai"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
