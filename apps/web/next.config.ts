import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = { poweredByHeader: false, reactStrictMode: true, outputFileTracingRoot: path.resolve(__dirname, "../.."), turbopack: { root: path.resolve(__dirname, "../..") } };
export default config;
