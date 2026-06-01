/**
 * ルートページ
 *
 * Step 1 ではログイン画面（/app/login）へ即リダイレクト。
 * Step 4 でここに LP を実装する。
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/app/login");
}
