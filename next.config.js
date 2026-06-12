/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["db"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
