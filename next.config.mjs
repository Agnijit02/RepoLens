/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark server-only packages as external so they don't get bundled for the client
  serverExternalPackages: ['simple-git'],

  // Silence Turbopack conflict with custom Webpack configuration
  turbopack: {},

  // Webpack config to handle Node.js built-ins in server components
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        child_process: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

export default nextConfig
