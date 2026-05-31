"use client";

/**
 * オンボーディング（チャットボット式4問）
 *
 * H-3 対応：tone を `s.tone` で保存する（`_tone` ではない！）
 * M-5 対応：salesStrength は明示的にデフォルト値を持つ
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { UserProfile, Tone, SalesStrength, DEFAULT_PROFILE } from "@/lib/types";
import { saveProfile } from "@/lib/profile-store";
import { getOrMigrateProfile } from "@/lib/profile-migrate";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Loader2 } from "lucide-react";

type QuestionId = "tone" | "aisatsu" | "exclaim" | "sales";

interface Option {
  /** 内部値 */
  v: string;
  /** 表示テキスト */
  t: string;
}

interface Question {
  id: QuestionId;
  bot: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "tone",
    bot: "はじめまして！メルパカです🦙\nまず、ふだんのメールの雰囲気を教えてください。",
    options: [
      { v: "casual", t: "フランク・短め" },
      { v: "balanced", t: "バランス重視" },
      { v: "formal", t: "きっちり丁寧" },
    ],
  },
  {
    id: "aisatsu",
    bot: "「お世話になっております」の挨拶は付けますか？",
    options: [
      { v: "skip", t: "基本つけない" },
      { v: "keep", t: "つける" },
    ],
  },
  {
    id: "exclaim",
    bot: "文末に「！」を使って親しみを出すこと、ありますか？",
    options: [
      { v: "yes", t: "よく使う" },
      { v: "no", t: "あまり使わない" },
    ],
  },
  {
    id: "sales",
    bot: "営業メールの判定はどのくらい強めにしますか？",
    options: [
      { v: "strong", t: "強め（積極的に振り分け）" },
      { v: "weak", t: "弱め（慎重に）" },
    ],
  },
];

type ChatMessage = { from: "bot" | "me"; text: string };

export default function OnboardingPage() {
  const router = useRouter();
  // Auth gate：未ログインなら /app/login へ
  const { ready: authReady, user } = useRequireAuth();
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<ChatMessage[]>([{ from: "bot", text: QUESTIONS[0].bot }]);
  const [draft, setDraft] = useState<UserProfile>(() => ({ ...DEFAULT_PROFILE }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証通過後：既にオンボーディング完了済み（Firestore or legacy localStorage）なら /app へ
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await getOrMigrateProfile(user.uid);
        if (cancelled) return;
        if (existing) {
          router.replace("/app");
        }
      } catch {
        // 読み込み失敗時はオンボーディングを表示（致命的ではない）
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user, router]);

  const currentQuestion = useMemo(() => (step < QUESTIONS.length ? QUESTIONS[step] : null), [step]);

  const pick = (opt: Option) => {
    if (!currentQuestion) return;
    const nextHistory: ChatMessage[] = [...history, { from: "me", text: opt.t }];

    // ★ H-3 修正：tone は必ず `tone` で保存（アンダースコアなし）
    const next: UserProfile = { ...draft };
    if (currentQuestion.id === "tone") next.tone = opt.v as Tone;
    if (currentQuestion.id === "aisatsu") next.skipAisatsu = opt.v === "skip";
    if (currentQuestion.id === "exclaim") next.exclaim = opt.v === "yes";
    if (currentQuestion.id === "sales") next.salesStrength = opt.v as SalesStrength;
    setDraft(next);

    if (step + 1 < QUESTIONS.length) {
      nextHistory.push({ from: "bot", text: QUESTIONS[step + 1].bot });
    } else {
      nextHistory.push({
        from: "bot",
        text: "ありがとうございます！\nあなたに合わせて初期設定を作成しました。さっそく始めましょう🦙",
      });
    }
    setHistory(nextHistory);
    setStep(step + 1);
  };

  const finish = async () => {
    if (!user || saving) return;
    setError(null);
    setSaving(true);
    try {
      // M-5 対策：未設定キーは DEFAULT_PROFILE から確実に埋まる
      // createdAt は saveProfile 側で serverTimestamp() が自動で入る
      const profileToSave: UserProfile = {
        ...DEFAULT_PROFILE,
        ...draft,
      };
      await saveProfile(user.uid, profileToSave);
      router.push("/app/settings?firstrun=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[--bg] flex flex-col">
      <div className="max-w-[640px] w-full mx-auto px-5 pt-8 flex-1 flex flex-col">
        <div className="mb-2">
          <div className="text-xs font-semibold text-[--text-secondary]">🦙 メルパカ・初期設定</div>
          <div className="text-xs text-[--text-secondary] mt-1">
            {Math.min(step + 1, QUESTIONS.length)} / {QUESTIONS.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {history.map((m, i) => (
            <div
              key={i}
              className={`flex mb-3 ${m.from === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                  m.from === "me"
                    ? "bg-[--tint] text-white rounded-[18px] rounded-br-[5px] font-medium"
                    : "bg-white text-black rounded-[18px] rounded-bl-[5px]"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="pb-8 flex flex-col gap-2">
          {currentQuestion ? (
            currentQuestion.options.map((o) => (
              <button
                key={o.v}
                onClick={() => pick(o)}
                className="w-full py-4 rounded-2xl bg-white text-[--tint] font-semibold text-base shadow-sm"
              >
                {o.t}
              </button>
            ))
          ) : (
            <>
              <button
                onClick={finish}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[--tint] text-white font-bold text-base disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    保存中…
                  </>
                ) : (
                  <>
                    <Sparkles size={17} strokeWidth={2.4} color="#fff" />
                    メルパカを始める
                  </>
                )}
              </button>
              {error && (
                <div className="px-3 py-2 rounded-xl bg-[--danger]/10 text-[--danger] text-xs leading-relaxed">
                  保存に失敗しました: {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
