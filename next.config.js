// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true }, // App Router aktivieren
  // Optional: absolute Imports
  compiler: { styledComponents: true },
};

module.exports = nextConfig;
