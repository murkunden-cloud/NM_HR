/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Uncomment if you are using Docker. Netlify handles this automatically.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
