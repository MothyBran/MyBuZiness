/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  // Wichtig: nothing special needed for App Router on Next 13/14,
  // aber falls du älter bist, hier kein appDir mehr nötig.
};

module.exports = nextConfig;
