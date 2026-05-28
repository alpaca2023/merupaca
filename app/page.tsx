/**
 * ルートページ
 *
 * Step 1 ではアプリ本体（/app）へ即リダイレクト。
 * Step 4 でここに LP を実装する。
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/app");
}
