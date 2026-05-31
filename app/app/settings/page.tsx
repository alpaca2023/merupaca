"use client";

/**
 * 設定画面（/app/settings）
 *
 * - 署名（会社名・氏名・略称・役職・URL・電話）
 * - 文体トグル（挨拶省略 / 「！」使用）
 * - 営業判定の強さ
 * - 文体学習の ON/OFF（Step 5 で実機能を接続）
 *
 * H-1 対応：このフォームの全項目はユーザーが自由に入力する。固定値は持たない。
 */

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { saveProfile, clearProfile } from "@/lib/profile-store";
import { getOrMigrateProfile } from "@/lib/profile-migrate";
import { UserProfile, DEFAULT_PROFILE } from "@/lib/types";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/lib/use-debounce";

const TINT = "#0a84ff";
const SAVE_DEBOUNCE_MS = 800;

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstRun = searchParams.get("firstrun") === "1";

  // Auth gate
  const { ready: authReady, user } = useRequireAuth();
  const { signOutUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 初回ロード完了フラグ。これが false の間はデバウンス保存を発火しない
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getOrMigrateProfile(user.uid);
        if (cancelled) return;
        if (!p) {
          router.replace("/app/onboarding");
          return;
        }
        setProfile(p);
        loadedRef.current = true;
      } catch (e) {
        if (cancelled) return;
        setSaveError(`プロフィール読み込み失敗: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user, router]);

  // デバウンス保存：profile の変更後 800ms 経ったら Firestore に書き込む
  const debouncedProfile = useDebouncedValue(profile, SAVE_DEBOUNCE_MS);
  useEffect(() => {
    if (!loadedRef.current || !user || !debouncedProfile) return;
    let cancelled = false;
    (async () => {
      try {
        await saveProfile(user.uid, debouncedProfile);
        if (!cancelled) setSaveError(null);
      } catch (e) {
        if (cancelled) return;
        setSaveError(`保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedProfile, user]);

  if (!authReady || !profile) return null;

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const back = () => router.push("/app");

  const handleReset = async () => {
    if (!user) return;
    if (!window.confirm("初期設定をやり直しますか？保存された設定は削除されます。")) return;
    try {
      await clearProfile(user.uid);
      router.push("/app/onboarding");
    } catch (e) {
      setSaveError(`削除に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm("ログアウトしますか？")) return;
    await signOutUser();
    router.replace("/app/login");
  };

  return (
    <main className="min-h-screen bg-[--bg]">
      {/* ナビバー */}
      <div className="sticky top-0 z-10 bg-[--bg]/85 backdrop-blur border-b border-black/[.08]">
        <div className="max-w-[640px] mx-auto px-2 h-12 relative flex items-center">
          <button
            onClick={back}
            type="button"
            className="relative z-10 flex items-center gap-1 px-2 py-2"
            aria-label="戻る"
          >
            <ChevronLeft size={24} color={TINT} strokeWidth={2.4} />
            <span className="text-[--tint] text-[17px]">戻る</span>
          </button>
          {/* タイトルはクリックを透過させる（pointer-events-none）。
              絶対配置で「戻る」ボタンの上に被っても click を奪わない */}
          <div className="absolute inset-0 flex items-center justify-center font-bold text-base pointer-events-none">
            設定
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 pt-4 pb-20">
        {isFirstRun && (
          <div className="mb-4 bg-[--tint]/10 text-[--tint] text-sm font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            あと少しだけ。署名情報を入れると、返信案にあなたの会社名・氏名が入ります。
          </div>
        )}

        {saveError && (
          <div className="mb-4 bg-[--danger]/10 text-[--danger] text-xs font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            {saveError}
          </div>
        )}

        {/* 署名 */}
        <SectionLabel>署名</SectionLabel>
        <Card>
          <TextRow label="会社名" value={profile.company} onChange={(v) => update("company", v)} placeholder="株式会社○○" />
          <TextRow label="氏名" value={profile.name} onChange={(v) => update("name", v)} placeholder="山田 太郎" />
          <TextRow
            label="略称（〜です）"
            value={profile.shortName}
            onChange={(v) => update("shortName", v)}
            placeholder="山田"
          />
          <TextRow label="役職" value={profile.title || ""} onChange={(v) => update("title", v)} placeholder="代表取締役（任意）" />
          <TextRow label="URL" value={profile.url || ""} onChange={(v) => update("url", v)} placeholder="https://example.com（任意）" />
          <TextRow
            label="電話"
            value={profile.tel || ""}
            onChange={(v) => update("tel", v)}
            placeholder="任意"
            last
          />
        </Card>

        {/* 文体 */}
        <SectionLabel>文体</SectionLabel>
        <Card>
          <ToggleRow
            label="「お世話になっております」を省く"
            on={profile.skipAisatsu}
            onChange={(v) => update("skipAisatsu", v)}
          />
          <ToggleRow label="文末に「！」を使う" on={profile.exclaim} onChange={(v) => update("exclaim", v)} last />
        </Card>

        {/* 営業メール判定 */}
        <SectionLabel>営業メール判定</SectionLabel>
        <Card>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14.5px] text-black">判定の強さ</span>
            <div className="flex gap-[2px] bg-black/[.08] rounded-lg p-[2px]">
              {(
                [
                  ["strong", "強め"],
                  ["weak", "弱め"],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  onClick={() => update("salesStrength", v)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-semibold ${
                    profile.salesStrength === v ? "bg-white shadow-sm" : ""
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* 文体学習 */}
        <SectionLabel>文体学習（Step 5 で接続予定）</SectionLabel>
        <Card>
          <ToggleRow
            label="採用した返信文を学習する"
            on={profile.learningEnabled}
            onChange={(v) => update("learningEnabled", v)}
            last
          />
        </Card>
        <p className="text-xs text-[--text-secondary] mx-2 mt-2 leading-relaxed">
          ※ ONにすると、コピーした返信文を最大20件まで保存し、次回以降の生成のお手本として使います。受信メール本文は保存されません。
        </p>

        {/* アカウント */}
        <SectionLabel>アカウント</SectionLabel>
        <Card>
          <div className="px-4 py-3 border-b border-[--border]">
            <div className="text-[11px] text-[--text-secondary] font-semibold mb-1">ログイン中</div>
            <div className="text-[14px] text-black break-all">{user?.email ?? user?.uid}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-[14.5px] text-black font-semibold"
          >
            <LogOut size={16} strokeWidth={2.4} color="#8e8e93" />
            ログアウトする
          </button>
        </Card>

        {/* リセット */}
        <SectionLabel>初期化</SectionLabel>
        <Card>
          <button
            onClick={handleReset}
            className="w-full px-4 py-3 text-left text-[14.5px] text-[--danger] font-semibold"
          >
            初期設定をやり直す
          </button>
        </Card>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}

/* ============ サブコンポーネント ============ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-[--text-secondary] mt-5 mb-2 mx-2">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl overflow-hidden">{children}</div>;
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center px-4 py-3 gap-3 ${last ? "" : "border-b border-[--border]"}`}>
      <span className="text-[14.5px] text-black flex-shrink-0">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-right text-[14.5px] text-[#636366] bg-transparent placeholder:text-[#c7c7cc]"
      />
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
  last,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${last ? "" : "border-b border-[--border]"}`}>
      <span className="text-[14.5px] text-black">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className="w-[50px] h-[30px] rounded-full relative transition-colors"
        style={{ backgroundColor: on ? "#34c759" : "#e5e5ea" }}
        aria-pressed={on}
      >
        <span
          className="absolute top-[2px] w-[26px] h-[26px] rounded-full bg-white shadow transition-all"
          style={{ left: on ? "22px" : "2px" }}
        />
      </button>
    </div>
  );
}

// 未使用変数の警告を避けるためのダミー（DEFAULT_PROFILE は型保証のみで実体不要）
void DEFAULT_PROFILE;
