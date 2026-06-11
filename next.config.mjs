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
  // The Documents folder is iCloud-synced, which evicts build artifacts
  // mid-compilation. The build dir must stay inside the project (Next.js runs
  // the build's require() from distDir, so node_modules has to be reachable by
  // walking up the tree — an external path breaks module resolution). The
  // ".nosync" suffix keeps the dir in place but tells iCloud Drive to leave it
  // alone. Covered by `tmp/` in .gitignore.
  ...(isVercel ? {} : { distDir: "tmp/logbook-next.nosync" }),
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
