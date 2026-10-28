import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy without nonces: Cache Components / partial
// prerendering serve a static shell, which can't carry per-request nonces
// (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// Inline scripts/styles stay allowed; everything else is locked to this origin.
function csp({ frameAncestors }: { frameAncestors: string }) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Everything except the hosted forms: no framing at all.
      {
        source: "/((?!f/).*)",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp({ frameAncestors: "'none'" }) }],
      },
      // Hosted forms are meant to be embedded in other sites. Submissions
      // still go to this origin only (form-action 'self').
      {
        source: "/f/:path*",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp({ frameAncestors: "*" }) }],
      },
    ];
  },
};

export default nextConfig;
