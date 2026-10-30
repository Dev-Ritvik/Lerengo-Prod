import type { NextConfig } from "next";

// L4 fix: `'unsafe-eval'` is only required by the webpack dev-server runtime
// (hot reload / React refresh eval machinery). Production builds do not need
// it, so we drop it whenever NODE_ENV === "production" to harden the CSP
// against client-side code-injection gadgets. `'unsafe-inline'` for scripts is
// retained in all environments because Razorpay's classic checkout loader and
// Next.js inline bootstrap payloads depend on it; removing it requires a
// nonce-based CSP migration (tracked separately).
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${IS_PRODUCTION ? "" : " 'unsafe-eval'"} https://checkout.razorpay.com https://app.cal.com https://cal.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://app.cal.com https://cal.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: ws: https://cal.com https://app.cal.com",
  "frame-src https://checkout.razorpay.com https://api.razorpay.com https://cal.com https://app.cal.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.razorpay.com https://api.razorpay.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
