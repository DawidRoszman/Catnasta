// One id per build. Next.js loads this file in several processes; storing it in
// the environment keeps the id the same in every one of them (child processes
// inherit it), so the client bundle and the /version route always agree.
const buildId = (process.env.CATNASTA_BUILD_ID ??= Date.now().toString(36));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  generateBuildId: async () => buildId,
  // Inlined into client and server code; open tabs compare theirs with /version.
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
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
