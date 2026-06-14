import type { NextConfig } from "next";

// Content-Security-Policy. 'unsafe-inline' for script/style is required because
// Next.js App Router injects inline bootstrap/RSC scripts and inline styles (we
// avoid nonces deliberately — there is a known Next nonce-related advisory).
// Even so, frame-ancestors / object-src / base-uri / form-action / connect-src
// add meaningful hardening. Shipped report-only first to catch real violations.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.r2.dev https://*.pexels.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.r2.dev https://*.trigger.dev wss://*.trigger.dev https://api.trigger.dev wss://api.trigger.dev",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Toggle: report-only collects violations without blocking; flip to
// "Content-Security-Policy" to enforce once the policy is clean on real pages.
const CSP_HEADER_NAME = "Content-Security-Policy-Report-Only";

// Safe baseline security headers applied to every response.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: CSP_HEADER_NAME, value: CSP },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    proxyClientMaxBodySize: "300mb",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
