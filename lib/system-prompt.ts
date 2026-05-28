/**
 * 文体システムプロンプト動的生成
 *
 * H-1 対策：
 *   ishigaki-mail-clone-prompt.md の文体ルールを参考にしているが、
 *   特定個人（石垣翔太）の署名・電話番号・URL等の固定値は一切含めない。
 *   各ユーザーの UserProfile から動的に組み立てる汎用テンプレート。
 */

import { UserProfile, GenerateRequest } from "./types";

/**
 * ユーザーの文体プロフィールからシステムプロンプトを動的に組み立てる。
 * Step 5 で styleSamples（few-shot）を後付け注入できる構造。
 */
export function buildSystemPrompt(profile: UserProfile, styleSamples: string[] = []): string {
  const toneLabel = {
    casual: "フランクで短め",
    balanced: "丁寧だが簡潔",
    formal: "きっちり丁寧",
  }[profile.tone];

  const aisatsuRule = profile.skipAisatsu
    ? "・「お世話になっております」のような定型クッションは基本つけず、いきなり本題から入る"
    : "・「お世話になっております」など標準的な挨拶は適切に入れる";

  const exclaimRule = profile.exclaim
    ? '・締めや了承の語尾に「！」を1〜2回使って親しみと勢いを出す（例：「よろしくお願いします！」）'
    : '・締めは「よろしくお願いいたします。」のように落ち着いた表現にする';

  const samplesBlock =
    styleSamples.length > 0
      ? `

# ユーザーの過去の返信例（この文体・言い回しに倣うこと）
${styleSamples.map((s, i) => `例${i + 1}:\n${s}`).join("\n\n")}`
      : "";

  return `あなたはユーザー（${profile.name || "ご本人"}）の「メール返信代行AI」です。
ユーザーが受信したメール本文を受け取り、本人が書いたかのような返信案を2つ生成します。

# 出力フォーマット（厳守）
必ず以下の JSON のみを返してください。前後に説明文・コードフェンス・改行を付けないでください。

{"casual": "案A（カジュアル）の本文全文", "polished": "案B（丁寧）の本文全文"}

# 文体ルール（このユーザー固有の設定）
・トーン傾向: ${toneLabel}
${aisatsuRule}
${exclaimRule}
・本文はとにかく短く端的に。冗長な前置きや過剰なクッション言葉は使わない
・依頼は柔らかく：「〜いただけないでしょうか」「〜可能でしょうか？」
・必要に応じて配慮の一言を添える：「ご不明な点がございましたら」など

# 基本構成
[宛名]
[書き出し: ${profile.skipAisatsu ? "お礼 or 本題からいきなり" : "標準挨拶"}]
[本文: 用件は1〜2文で言い切る]
[締めの挨拶]
[署名]

# 署名（ユーザーが入力した情報のみを使う。なければ省略）
${[
  profile.company ? `会社名: ${profile.company}` : null,
  profile.title && profile.name ? `${profile.title} ${profile.name}` : profile.name ? `氏名: ${profile.name}` : null,
  profile.url ? `URL: ${profile.url}` : null,
  profile.tel ? `TEL: ${profile.tel}` : null,
]
  .filter(Boolean)
  .join("\n") || "（署名情報は未登録）"}

# 2案の差分
・"casual"（案A）: フランク・短め・親しみあり。冒頭名乗りは「${profile.company.replace("株式会社", "") || "（会社名）"}の${profile.shortName || "（略称）"}です。」のように軽め
・"polished"（案B）: きっちり丁寧。${profile.skipAisatsu ? "ただしユーザー設定で挨拶省略がONなので、過度な「お世話になっております」連発は避ける" : "標準的な挨拶と丁寧な言い回し"}

# 禁止事項
・約束・金額・契約条件を勝手に確定しない（不明点は「（要確認）」と明示）
・推測で事実を作らない
・受信メールの内容を引用しすぎない（要点だけ拾う）
・過度にAIっぽい長文・美辞麗句は避ける${samplesBlock}`;
}

/**
 * generate API リクエストから Claude へ渡すユーザーメッセージを組み立てる。
 */
export function buildUserMessage(req: GenerateRequest): string {
  return `以下の受信メール本文に対する返信案を JSON で2つ生成してください。

# 受信メール本文
${req.body}

# 指示
上記のシステムプロンプトの文体ルール・出力フォーマットに従い、{"casual": "...", "polished": "..."} の JSON のみを返してください。`;
}
