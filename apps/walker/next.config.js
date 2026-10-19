/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@artwalk/ar-renderer",
    "@artwalk/geo-anchor",
    "@artwalk/gamification",
    "@artwalk/citizen-science",
    "@artwalk/missions",
    "@artwalk/data-refinery",
    "@artwalk/spatial-content",
  ],
  // PWA headers — full manifest + service worker wiring handled by next-pwa if added
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Required for camera access in cross-origin iframes (8th Wall)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
