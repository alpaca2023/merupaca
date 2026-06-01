# メルパカ（merupaca）

> **メール × アルパカ** — 受信メール本文を貼り付けると、AI があなたの文体で返信案を 2 つ生成する SaaS。
> 生成した案はコピーして自分のメーラーで送信します。**Gmail API は使いません。**
> 提供元：株式会社アルパカ

このドキュメントは引き継ぎ用です。**まず「[5 分でローカル起動](#5-分でローカル起動)」と「[絶対に守る制約](#絶対に守る制約必読)」を読んでから着手してください。**

---

## プロダクト概要

- **誰のため**：中小企業の社長・個人事業主。メール返信に時間を取られている人。
- **何をする**：受信したメールの本文を貼り付け → AI が **案A（カジュアル）/ 案B（丁寧）** を生成 → 選んで微修正 → **コピー**して自分のメーラーへ。
- **なぜ「貼り付け型」か**：Gmail API の審査（数週間〜）を回避し、短期でリリースするため。自動送信・自動取得は行わない。自社専用の自動連携版（Phase 1）は別プロジェクトで検討。

### 課金モデル
| プラン | 内容 |
|---|---|
| 無料 | 1 日 5 通まで |
| 有料 | ¥1,980 / 月（無制限 + 文体カスタム学習） |

---

## 絶対に守る制約（必読）

実装・レビュー時にこの 4 点を破ると仕様違反になります。

1. **Gmail API・自動送信・受信メール本文の保存は一切しない。** 受信本文は生成処理に渡すだけで DB に保存しない。UI に「送信した」と出さない（ボタンは「コピー」まで）。
2. **文体学習はオプトイン**（`learningEnabled` のデフォルトは `false`）。ユーザーが学習データを全削除できること。
3. **Claude API キーはサーバー側のみ**（`/app/api/**` の API Route 内だけ）。クライアントバンドルに絶対に含めない。
4. **Stripe Webhook は署名検証必須**（Step 3 で実装）。

> 過去のレビュー指摘（H/M/L）は [docs/未対応のレビュー指摘](#未対応のレビュー指摘実装時に必ず確認) を参照。Step 2 以降の実装前に必ず目を通すこと。

---

## 技術スタック

| 領域 | 採用技術 | 備考 |
|---|---|---|
| フレームワーク | Next.js 14（App Router）+ TypeScript | `next@14.2.35` |
| スタイル | Tailwind CSS | `tailwind.config.ts` |
| UI | React 18 / framer-motion / lucide-react | アイコンは lucide |
| AI | Anthropic Claude API（`@anthropic-ai/sdk`） | モデル `claude-sonnet-4-5`（[route.ts](app/api/generate/route.ts)） |
| 認証 | Firebase Authentication（Google + メールリンク） | Step 2 で実装済み |
| DB | Firestore（+ Firebase Admin SDK） | プロフィール保存・利用制限・課金更新で使用 |
| 課金 | Stripe（Checkout / Customer Portal / Webhook） | コード実装済み。Stripe 側設定・Secret 登録が必要 |
| ホスティング | Firebase App Hosting | Vercel から切替済み（2026-05-29） |
| ローカル Node | v24 系で動作確認（`next@14` は Node 18.17+ 必須） | |

---

## 5 分でローカル起動

```bash
# 1. 依存インストール
npm install

# 2. 環境変数ファイルを作成
cp .env.local.example .env.local
#   → .env.local を開き、最低限 ANTHROPIC_API_KEY を設定（Step 1 はこれだけで動く）

# 3. 開発サーバー起動
npm run dev
#   → http://localhost:3000 を開く（/ は /app へリダイレクト）
```

初回アクセスでオンボーディング（4 問のチャット形式）へ誘導され、完了するとアプリ本体が使えます。

### npm スクリプト
| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（HMR） |
| `npm run build` | 本番ビルド |
| `npm run start` | ビルド済みを起動 |
| `npm run lint` | ESLint（`eslint-config-next`） |

---

## 環境変数

`.env.local`（git 管理外）に設定。テンプレートは [.env.local.example](.env.local.example)。
本番は値を **Secret Manager** に置き、`apphosting.yaml` で参照名のみ宣言する（[シークレット運用](#シークレット運用)参照）。

| 変数 | いつ必要 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Step 1（必須）** | Claude API。サーバー側のみ |
| `NEXT_PUBLIC_FIREBASE_*` | Step 2 | Firebase Client SDK（公開可） |
| `FIREBASE_ADMIN_*` | Step 3 | Firebase Admin SDK（Webhook で plan 更新） |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Step 3 | Stripe 課金 |
| `NEXT_PUBLIC_BASE_URL` | 任意 | リダイレクト URL 構築用 |

> `NEXT_PUBLIC_` 接頭辞はクライアントに露出します。**シークレット系には絶対に付けない。**

---

## ディレクトリ構成

```
Merupaca/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ルートレイアウト（AuthProvider をマウント）
│   ├── page.tsx                  # "/" → "/app" へリダイレクト（Step 4 で LP 実装予定）
│   ├── globals.css               # Tailwind ベース
│   ├── api/
│   │   └── generate/route.ts     # ★ 返信案生成 API（Claude 呼び出し・サーバー専用）
│   └── app/                      # アプリ本体（要オンボーディング）
│       ├── page.tsx              # 貼り付け→生成→案A/B選択→編集→コピー
│       ├── onboarding/page.tsx   # 文体オンボーディング（4 問チャット式）
│       └── settings/page.tsx     # 署名・文体トグル・営業判定・学習ON/OFF
├── lib/
│   ├── types.ts                  # ★ 共通型・DEFAULT_PROFILE・MAX_BODY_LENGTH
│   ├── system-prompt.ts          # ★ 文体システムプロンプトを profile から動的生成
│   ├── profile-store.ts          # プロフィール永続化（Firestore + 旧 localStorage 移行）
│   ├── sales-detect.ts           # 営業メール簡易判定（キーワードヒント表示のみ）
│   ├── firebase.ts               # Firebase Client 初期化
│   ├── firebase-admin.ts         # Firebase Admin 初期化（利用制限 / Step 3 Webhook）
│   └── auth-context.tsx          # 認証 Context
├── apphosting.yaml               # Firebase App Hosting 実行構成・シークレット参照
├── .env.local.example            # 環境変数テンプレート
└── tsconfig.json                 # パスエイリアス "@/*" → "./*"
```

`★` = 主要ファイル。まずここを読むと全体像がつかめます。

---

## アーキテクチャ / データフロー（Step 1 現状）

```
[ユーザー] 受信メール本文を貼り付け
   │
   ▼
app/app/page.tsx  ── loadProfile()（localStorage から文体プロフィール取得）
   │                detectSales()（営業ワードならヒント表示。仕分けはしない）
   │  POST /api/generate { body, profile, styleSamples? }
   ▼
app/api/generate/route.ts（サーバー / runtime=nodejs）
   │  ・3,000 文字超は 400
   │  ・buildSystemPrompt(profile, styleSamples) で文体プロンプト生成
   │  ・Claude (claude-sonnet-4-5) 呼び出し
   │  ・JSON {"casual","polished"} をパース（失敗時 1 回リトライ）
   ▼
[結果画面] 案A/案B を表示 → ユーザーが選択・編集 → 「コピー」
```

ポイント：
- **文体プロンプトは固定値を持たず、ユーザーの `UserProfile` から毎回動的生成**（[system-prompt.ts](lib/system-prompt.ts)）。特定個人の署名・電話番号などは一切ハードコードしない（過去レビュー H-1）。
- 受信本文はレスポンス生成に使うだけで保存しない。
- `styleSamples`（few-shot）は引数として受けられる構造だが、接続は **Step 5**。

---

## Firestore スキーマ（Step 2 以降で実装）

> 現状 Step 1 は localStorage（キー `merupaca:profile:v1`）で代替。Step 2 で下記に移行する。

```
users/{uid}
  - company, name, shortName, title, url, tel   # 署名情報（任意項目あり）
  - skipAisatsu, exclaim, tone                   # 文体トグル（フィールド名は tone。_tone ではない）
  - salesStrength                                # 営業判定の強さ "strong" | "weak"
  - learningEnabled                              # 文体学習オプトイン（default false）
  - plan, stripeCustomerId, subscriptionStatus, createdAt

users/{uid}/usage/{YYYY-MM-DD}                   # 日付キーは JST(UTC+9) で生成すること（過去レビュー M-1）
  - count                                        # その日の生成回数（無料は 5/日）

users/{uid}/styleSamples/{autoId}                # 文体学習サンプル（Step 5）
  - text, variant, createdAt                     # 20 件超で古い順に間引き（過去レビュー M-2）
```

> 型の正は [lib/types.ts](lib/types.ts) の `UserProfile`。スキーマ変更時は型 → ストア → UI の順で揃える。

---

## デプロイ（Firebase App Hosting）

- **方式**：GitHub `main` への push で**自動ロールアウト**（CI 不要）。
- **Firebase プロジェクト ID**：`merupaca`
- **バックエンド ID**：`merupaca`
- **本番 URL**：https://merupaca--merupaca.asia-east1.hosted.app
- **リージョン**：`asia-east1`（台湾）
- **構成**：[apphosting.yaml](apphosting.yaml)（`runConfig.minInstances: 0` — ベータ規模のためコールドスタート許容）

### リリース手順（Step 2 以降の標準フロー）
```bash
# 1. 最新を取り込む
git fetch origin && git merge origin/main

# 2. 実装・修正

# 3. 型チェック & Lint（.next のキャッシュ型を消してから）
rm -rf .next/dev/types && npx tsc --noEmit && npx next lint

# 4. 個別ファイルを add（"-A" は使わない＝意図しない混入を防ぐ）
git add <変更ファイル>

# 5. コミット（メッセージ規約：<種別>(merupaca): 概要）
git commit -m "feat(merupaca): ..."

# 6. push → App Hosting が自動ロールアウト
git push origin main

# 7. 状態確認
firebase apphosting:backends:list --project merupaca
curl -I https://merupaca--merupaca.asia-east1.hosted.app/   # 200 / 307 を確認
```

コミット種別の例：`feat` / `fix` / `chore` / `refactor`（既存ログに準拠）。

---

## シークレット運用

- 登録：`firebase apphosting:secrets:set <KEY> --project merupaca`
- **値の入力は本人（Shota）が直接行う。チャットや commit、コード、ドキュメントに値を残さない。**
- `apphosting.yaml` には**参照名のみ**を書く（値は Secret Manager 側）。
- 登録済み：`ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / `FIREBASE_ADMIN_*` を App Hosting の Secret Manager に登録する。

---

## 実装ロードマップ（Phase 0）

| Step | 内容 | 状態 |
|---|---|---|
| 1 | アプリ本体（貼り付け→案A/B 生成）+ オンボーディング + 設定 | ✅ 完了（main: `f67b8de`） |
| 2 | Firebase Auth + 利用制限（1 日 5 通） | ✅ 完了 |
| 3 | Stripe 課金（Checkout / Portal / Webhook） | ✅ コード実装済み（Stripe 側設定・Secret 登録待ち） |
| 4 | LP（`/`）制作 + SEO | ⬜ 未着手 |
| 5 | 文体学習機能（few-shot・オプトイン） | ⬜ 未着手 |
| 6 | リリース準備（プライバシーポリシー / 利用規約 / アナリティクス） | ⬜ 未着手 |

### 次に着手する人へ（Step 4 の入口）
1. `/` の即リダイレクトを LP に差し替える。
2. SEO メタデータと OGP を設定する。
3. ログイン済みユーザー向けの導線は `/app` へ残す。
4. Stripe Dashboard で Customer Portal と Webhook endpoint（`/api/stripe/webhook`）を設定し、Secret Manager の値を本番反映する。

---

## 未対応のレビュー指摘（実装時に必ず確認）

過去のレビューで挙がった対応事項。該当 Step に入る前に必ず確認すること。Step 1 完了時点で H-1〜H-3 は対応済み。

**中（対応推奨 / Step 4 以降で実装）**
- **M-2**：`styleSamples` 書き込み時、`createdAt` 昇順で取得し **20 件超なら古いものを batch 削除**（Step 5）。
- **M-3**：`/api/generate` に **短時間の UID/IP 単位レートリミット**（Claude コスト暴発防止）。1 日 5 通の無料枠制限は対応済み。
- **M-5**：ユーザー作成時に `salesStrength` を明示設定（未定義を作らない）。→ `DEFAULT_PROFILE` で対応済み。

**低**
- **L-1**：移植時の SEED データは架空データにする（実ドメイン・実会社名を使わない）。
- **L-3**：入力本文は **最大 3,000 文字**。→ API・UI で対応済み（`MAX_BODY_LENGTH`）。

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `/api/generate` が 500（`ANTHROPIC_API_KEY が設定されていません`） | `.env.local` にキー未設定。設定後 `npm run dev` を再起動 |
| 生成が `生成に失敗しました` | Claude が JSON 以外を返した可能性。route 側で 1 回リトライ済み。プロンプト改変時は出力フォーマット厳守を確認 |
| 型チェックがキャッシュで誤検知 | `rm -rf .next/dev/types` してから `npx tsc --noEmit` |
| オンボーディングが再表示される | localStorage `merupaca:profile:v1` が無い/破損。設定画面から再保存 |
| デプロイが反映されない | `main` への push か、App Hosting のロールアウト状態を `firebase apphosting:backends:list` で確認 |

---

## リンク

- GitHub：https://github.com/alpaca2023/merupaca （org: `alpaca2023`）
- 本番：https://merupaca--merupaca.asia-east1.hosted.app
- Firebase Console：プロジェクト `merupaca`
- Anthropic API：https://console.anthropic.com
