/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    // Handle @cloudflare/blindrsa-ts library compatibility
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
    }));
    
    // Fallback for Node.js modules that might be required by the blind RSA library
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    };
    
    return config;
  },
};

module.exports = nextConfig; 