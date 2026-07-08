/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker multi-stage builds
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Disable powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
