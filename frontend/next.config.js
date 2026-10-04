/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Self-contained server bundle for the production Docker image.
  output: "standalone",
  async rewrites() {
    // In production the browser only talks to this app: API calls and the
    // WebSocket are proxied to the API over the internal Docker network.
    const target = process.env.API_INTERNAL_URL;
    if (!target) {
      return [];
    }
    return [
      { source: "/api/:path*", destination: `${target}/:path*` },
      { source: "/ws", destination: `${target}/ws` },
    ];
  },
};

module.exports = nextConfig;
