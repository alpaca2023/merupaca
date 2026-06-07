/**
 * ルートページ（LP / ランディングページ）
 *
 * Step 4 で実装。SEO のためサーバーコンポーネントとして静的に描画する。
 * 認証状態で変わる CTA だけを <LandingCTA>（クライアント）に分離している。
 *
 * 構成：ヒーロー → 痛み → 解決（貼る/選ぶ/コピー）→ 効く理由・信頼 → CTA → フッター
 * コピーは「読者の場面」を主語に置き、機能名・抽象語（効率化/自動化）を避けている。
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  Inbox,
  Snowflake,
  ClipboardPaste,
  CheckCheck,
  Copy,
  PenLine,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { LandingCTA } from "./_components/landing-cta";

export const metadata: Metadata = {
  title: "メルパカ — 気の重い返信が、すきま時間で片づく",
  description:
    "受信メールを貼るだけで、自分の言葉のままの返信案が2つ。気を遣う一通に悩んで溜め込む毎日を終わりに。中小企業の社長・個人事業主のためのメール返信ツール。1日5通まで無料。",
  alternates: { canonical: "/" },
  openGraph: {
    title: "メルパカ — 気の重い返信が、すきま時間で片づく",
    description:
      "受信メールを貼るだけで、自分の言葉のままの返信案が2つ。気を遣う一通に悩んで溜め込む毎日を終わりに。1日5通まで無料。",
    url: "/",
    type: "website",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[--bg] text-[--text]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-[--border] bg-[--bg]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🦙
            </span>
            <span className="text-lg font-extrabold tracking-tight">メルパカ</span>
          </div>
          <Link
            href="/app/login"
            className="text-sm font-semibold text-[--tint]"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="px-5">
        <div className="mx-auto max-w-[720px] pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[--card] px-3 py-1 text-xs font-semibold text-[--text-secondary] shadow-sm">
            <span className="text-sm" aria-hidden>
              🦙
            </span>
            社長・個人事業主のためのメール返信ツール
          </p>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[44px]">
            「なんて返そう」で
            <br className="sm:hidden" />
            止まっていた返信が、
            <br />
            すきま時間で片づく。
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-relaxed text-[--text-secondary] sm:text-base">
            気を遣う一通に何十分も悩み、溜め込んでいた毎日から──
            受信メールを貼って選ぶだけで、“自分の言葉のままの返信”が
            出来上がる毎日へ。
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <LandingCTA size="large" label="無料で試す" />
            <p className="text-xs text-[--text-secondary]">
              1日5通まで無料・登録のみ・クレジットカード不要
            </p>
          </div>
        </div>
      </section>

      {/* 痛みの言語化 */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-[820px]">
          <h2 className="mb-2 text-center text-[22px] font-extrabold tracking-tight sm:text-[28px]">
            こんな返信、後回しにしていませんか
          </h2>
          <p className="mb-9 text-center text-sm text-[--text-secondary]">
            メール返信は「面倒」ではなく「気が重い」。だから溜まる。
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <PainCard
              icon={<Clock size={22} strokeWidth={2.2} />}
              title="言葉を選びすぎて、1通に30分"
              body="取引先へのお詫びやお断り。書いては消してを繰り返し、気づけば手が止まっている。"
            />
            <PainCard
              icon={<Inbox size={22} strokeWidth={2.2} />}
              title="気づけば未読が二桁"
              body="「あとで返そう」が積み上がる。返さなきゃと思うほど、開くのが億劫になる。"
            />
            <PainCard
              icon={<Snowflake size={22} strokeWidth={2.2} />}
              title="急ぐと素っ気なくなる"
              body="慌てて返すと冷たい印象に。相手に失礼じゃないかと、いつも不安が残る。"
            />
          </div>
        </div>
      </section>

      {/* 解決（貼る→選ぶ→コピー） */}
      <section className="bg-[--card] px-5 py-16">
        <div className="mx-auto max-w-[820px]">
          <h2 className="mb-2 text-center text-[22px] font-extrabold tracking-tight sm:text-[28px]">
            貼って、選んで、コピーするだけ
          </h2>
          <p className="mb-10 text-center text-sm text-[--text-secondary]">
            受信メールを貼るだけで、すぐ送れる返信が2案。あとは選ぶだけ。
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            <StepCard
              step="1"
              icon={<ClipboardPaste size={24} strokeWidth={2.2} />}
              title="受信メールを貼る"
              body="返信したいメールの本文を貼り付けるだけ。Gmail連携も面倒な設定も不要。"
            />
            <StepCard
              step="2"
              icon={<CheckCheck size={24} strokeWidth={2.2} />}
              title="2案から選ぶ"
              body="カジュアルと丁寧、2つの返信案が出る。自分の言い回しだから、ほぼ直さず使える。"
            />
            <StepCard
              step="3"
              icon={<Copy size={24} strokeWidth={2.2} />}
              title="コピーして送る"
              body="気になる所だけ直してコピー。溜まっていた返信が、移動中や合間にまとめて片づく。"
            />
          </div>
        </div>
      </section>

      {/* 効く理由・信頼 */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-[820px]">
          <h2 className="mb-2 text-center text-[22px] font-extrabold tracking-tight sm:text-[28px]">
            “自分が書いた風”になる理由
          </h2>
          <p className="mb-9 text-center text-sm text-[--text-secondary]">
            ただの自動返信ではありません。あなたの文体で、安心して使えます。
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <ReasonCard
              icon={<PenLine size={22} strokeWidth={2.2} />}
              title="あなたの文体で書く"
              body="あいさつの癖・口調・署名を覚えて書くAIだから、“自分が書いた風”の返信になります。"
            />
            <ReasonCard
              icon={<ShieldCheck size={22} strokeWidth={2.2} />}
              title="本文は保存しません"
              body="受信したメールの本文は保存しません。返信を作る、その場で使うだけです。"
            />
            <ReasonCard
              icon={<Zap size={22} strokeWidth={2.2} />}
              title="設定なしで、すぐ"
              body="アカウントを作ればすぐ使えます。連携も初期設定も不要。今日の1通からどうぞ。"
            />
          </div>
        </div>
      </section>

      {/* 最終 CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-[720px] rounded-3xl bg-[--card] px-6 py-12 text-center shadow-sm sm:px-10">
          <h2 className="text-[22px] font-extrabold leading-snug tracking-tight sm:text-[28px]">
            まずは今日の溜まった1通から。
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-sm leading-relaxed text-[--text-secondary]">
            気が重かったあの返信を、すきま時間で片づける感覚を試してください。
            1日5通まで無料です。
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <LandingCTA size="large" label="無料で試す" />
            <p className="text-xs text-[--text-secondary]">
              登録のみ・クレジットカード不要
            </p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-[--border] px-5 py-8">
        <div className="mx-auto flex max-w-[960px] flex-col items-center justify-between gap-3 text-xs text-[--text-secondary] sm:flex-row">
          <div className="flex items-center gap-2">
            <span aria-hidden>🦙</span>
            <span>メルパカ</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/app/login" className="hover:text-[--text]">
              ログイン
            </Link>
            <a href="#" className="hover:text-[--text]">
              利用規約
            </a>
            <a href="#" className="hover:text-[--text]">
              プライバシーポリシー
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PainCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-[--card] p-5 shadow-sm">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[--danger]/10 text-[--danger]">
        {icon}
      </div>
      <h3 className="mb-1.5 text-[15px] font-bold leading-snug">{title}</h3>
      <p className="text-[13px] leading-relaxed text-[--text-secondary]">{body}</p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[--tint]/10 text-[--tint]">
        {icon}
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[--tint] text-xs font-bold text-white">
          {step}
        </span>
      </div>
      <h3 className="mb-1.5 text-[15px] font-bold leading-snug">{title}</h3>
      <p className="mx-auto max-w-[240px] text-[13px] leading-relaxed text-[--text-secondary]">
        {body}
      </p>
    </div>
  );
}

function ReasonCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-[--card] p-5 shadow-sm">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[--success]/10 text-[--success]">
        {icon}
      </div>
      <h3 className="mb-1.5 text-[15px] font-bold leading-snug">{title}</h3>
      <p className="text-[13px] leading-relaxed text-[--text-secondary]">{body}</p>
    </div>
  );
}
