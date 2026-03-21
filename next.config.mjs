/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === "1";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for hydration scripts;
      // dev mode also needs 'unsafe-eval' for hot-module replacement.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws://localhost:3000",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  // Move build output to /tmp locally to avoid iCloud sync interference
  // (Documents folder is iCloud-synced, which deletes temp files mid-compilation)
  ...(isVercel ? {} : { distDir: "/tmp/logbook-next" }),
  eslint: {
    // Pre-existing ESLint errors (unescaped entities, unused vars) from the Vite era.
    // Allow build to succeed while we clean these up separately.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
