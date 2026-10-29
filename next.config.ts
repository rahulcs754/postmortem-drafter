import type { NextConfig } from "next";

const config: NextConfig = {
  // Fixtures are read from disk at request time by the draft API route.
  outputFileTracingIncludes: { "/api/draft": ["./examples/**/*"] },
};

export default config;
