/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@next/swc-*/**',
      'node_modules/react-native/**',
      'node_modules/@react-native/**',
      'node_modules/metro/**',
      'node_modules/hermes-parser/**',
      'node_modules/react-devtools-core/**',
      'node_modules/typescript/**',
      'node_modules/eslint/**',
      'node_modules/@img/**',
      'node_modules/sharp/**',
      'node_modules/@emurgo/**',
      'node_modules/@stellar/**',
      'node_modules/xrpl/**',
      'node_modules/viem/**',
      'node_modules/@ethereumjs/**',
      'node_modules/usb/**',
    ],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    // Prevent bundling optional native deps
    config.externals.push({ canvas: 'commonjs canvas' });
    return config;
  },
};

export default nextConfig;
