import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
