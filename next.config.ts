import type { NextConfig } from "next";

// Baseline defensive headers. The CSP intentionally limits only embedding,
// base URLs, plugins, and form targets; script/style policy needs nonce-based
// Next.js integration and should not be guessed with unsafe-inline values.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Origin-Agent-Cluster", value: "?1" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
