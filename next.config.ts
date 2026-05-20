import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const withSerwistConfig = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown"],
};

export default withSerwistConfig(nextConfig);
