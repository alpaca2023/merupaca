/**
 * OGP 画像（/opengraph-image）
 *
 * SNS シェア時に表示される 1200×630 のカード画像を動的生成する。
 * 日本語グリフのため、OGP 文言だけにサブセットした IPAGothic を同梱して読み込む
 * （`import.meta.url` 経由で本番バンドルにも確実にトレースされる）。
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "メルパカ — 気の重い返信が、すきま時間で片づく";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const font = await readFile(
    join(process.cwd(), "app", "_assets", "og-font.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          background:
            "linear-gradient(135deg, #f2f2f7 0%, #ffffff 55%, #e9f2ff 100%)",
          fontFamily: "OG",
          color: "#000000",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            color: "#0a84ff",
            marginBottom: 28,
          }}
        >
          メルパカ
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}
        >
          気の重い返信が、すきま時間で片づく。
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#3a3a3c",
            marginTop: 32,
            lineHeight: 1.5,
          }}
        >
          受信メールを貼るだけで自分の言葉のまま返信案を2つ
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            fontSize: 26,
            color: "#ffffff",
            background: "#0a84ff",
            padding: "12px 28px",
            borderRadius: 9999,
            marginTop: 44,
          }}
        >
          1日5通まで無料・登録のみ
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "OG", data: font, weight: 400, style: "normal" }],
    },
  );
}
