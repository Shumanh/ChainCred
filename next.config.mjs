/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals = config.externals || [];
    // Prevent bundling optional native deps
    config.externals.push({ canvas: 'commonjs canvas' });
    return config;
  },
};

export default nextConfig;
