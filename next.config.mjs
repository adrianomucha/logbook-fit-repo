/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === "1";

const nextConfig = {
  // Move build output to /tmp locally to avoid iCloud sync interference
  // (Documents folder is iCloud-synced, which deletes temp files mid-compilation)
  ...(isVercel ? {} : { distDir: "/tmp/logbook-next" }),
  eslint: {
    // Pre-existing ESLint errors (unescaped entities, unused vars) from the Vite era.
    // Allow build to succeed while we clean these up separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
