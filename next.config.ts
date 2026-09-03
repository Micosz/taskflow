import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The JS compiler API is stable with our TypeScript 5 toolchain and avoids
  // process-output issues in restricted build environments.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
