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
import { ChevronLeft, CreditCard, Loader2, LogOut } from "lucide-react";
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
  const billingResult = searchParams.get("billing");

  // Auth gate
  const { ready: authReady, user } = useRequireAuth();
  const { signOutUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<"checkout" | "portal" | null>(null);
  const [flushing, setFlushing] = useState(false);
  // 初回ロード完了フラグ。これが false の間はデバウンス保存を発火しない
  const loadedRef = useRef(false);

  // M-1 対策：unmount 時の best-effort flush で参照する最新値を ref で持つ
  // （useEffect cleanup 内ではクロージャ越しに古い値を参照してしまうため）
  const profileRef = useRef<UserProfile | null>(null);
  const userRef = useRef(user);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  // M-1 対策：unmount 時に未保存の変更を best-effort で flush
  // （タブを閉じる、ブラウザバック等で「戻る」ボタンを経由しないケース対策）
  // ref で最新値を参照するため deps は空でよい
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      const latestProfile = profileRef.current;
      const latestUser = userRef.current;
      if (loadedRef.current && latestUser && latestProfile) {
        // No await（unmount 中なので fire-and-forget）
        saveProfile(latestUser.uid, latestProfile).catch(() => {
          // unmount 中で UI 更新できないため握りつぶす
        });
      }
    };
  }, []); // 空配列：アンマウント時のみ実行

  if (!authReady || !profile) return null;

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // M-1 対策：「戻る」押下時はデバウンスを待たず最新の profile を必ず保存してから遷移
  // 保存失敗時は遷移せずエラー表示
  const back = async () => {
    if (flushing) return;
    if (user && profile && loadedRef.current) {
      setFlushing(true);
      try {
        await saveProfile(user.uid, profile);
        setSaveError(null);
      } catch (e) {
        setSaveError(`保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
        setFlushing(false);
        return;
      }
      setFlushing(false);
    }
    router.push("/app");
  };

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

  const openBilling = async (mode: "checkout" | "portal") => {
    if (!user || billingLoading) return;
    setBillingError(null);
    setBillingLoading(mode);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/billing/${mode}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "課金ページを開けませんでした");
      }
      window.location.assign(data.url);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : String(e));
      setBillingLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[--bg]">
      {/* ナビバー */}
      <div className="sticky top-0 z-10 bg-[--bg]/85 backdrop-blur border-b border-black/[.08]">
        <div className="max-w-[640px] mx-auto px-2 h-12 relative flex items-center">
          <button
            onClick={back}
            type="button"
            disabled={flushing}
            className="relative z-10 flex items-center gap-1 px-2 py-2 disabled:opacity-50"
            aria-label="戻る"
          >
            <ChevronLeft size={24} color={TINT} strokeWidth={2.4} />
            <span className="text-[--tint] text-[17px]">{flushing ? "保存中…" : "戻る"}</span>
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

        {billingResult === "success" && (
          <div className="mb-4 bg-[--success]/10 text-[--success] text-sm font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            お支払い手続きが完了しました。反映まで少し時間がかかる場合があります。
          </div>
        )}

        {billingResult === "cancel" && (
          <div className="mb-4 bg-[#ff9f0a]/10 text-[#c77700] text-sm font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            お支払い手続きをキャンセルしました。
          </div>
        )}

        {saveError && (
          <div className="mb-4 bg-[--danger]/10 text-[--danger] text-xs font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            {saveError}
          </div>
        )}

        {billingError && (
          <div className="mb-4 bg-[--danger]/10 text-[--danger] text-xs font-semibold rounded-2xl px-4 py-3 leading-relaxed">
            {billingError}
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

        {/* プラン */}
        <SectionLabel>プラン</SectionLabel>
        <Card>
          <div className="px-4 py-3 border-b border-[--border] flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-[--text-secondary] font-semibold mb-1">現在のプラン</div>
              <div className="text-[14.5px] text-black font-semibold">
                {profile.plan === "paid" ? "有料プラン" : "無料プラン"}
              </div>
              <div className="text-[11px] text-[--text-secondary] mt-1">
                {profile.plan === "paid" ? "返信案生成は無制限です" : "返信案生成は1日5通までです"}
              </div>
            </div>
            <CreditCard size={18} strokeWidth={2.4} color="#8e8e93" />
          </div>
          <button
            onClick={() => openBilling(profile.plan === "paid" ? "portal" : "checkout")}
            disabled={billingLoading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[14.5px] text-[--tint] font-semibold disabled:opacity-50"
          >
            {billingLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            {profile.plan === "paid" ? "支払い情報を管理する" : "有料プランに変更する"}
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
