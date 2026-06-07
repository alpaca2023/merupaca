/** @type {import('next').NextConfig} */
const nextConfig = {
  // OGP/Twitter 画像生成が実行時に読む同梱フォントを standalone バンドルに含める。
  experimental: {
    outputFileTracingIncludes: {
      "/opengraph-image": ["./app/_assets/og-font.ttf"],
      "/twitter-image": ["./app/_assets/og-font.ttf"],
    },
  },
  async headers() {
    return [
      {
        // 認証ページ（/app 配下）はキャッシュ無効。
        // "/" は公開 LP になったため no-store は外し、CDN キャッシュを許可する。
        source: "/app/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
