"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-[80vh]">
      <h1 className="text-xl font-bold text-warm-900 mb-6">
        この診断でわかること
      </h1>

      <div className="space-y-4 mb-8">
        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="font-medium text-warm-800 mb-1">
            あなたの価値観タイプ
          </h3>
          <p className="text-sm text-text-light">
            10カテゴリのスコアから、あなたの主タイプとサブタイプを判定します。
          </p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="font-medium text-warm-800 mb-1">
            お金観・経済感覚の深層分析
          </h3>
          <p className="text-sm text-text-light">
            経済的な価値観を重点的に分析し、パートナーとの相性を深掘りします。
          </p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="font-medium text-warm-800 mb-1">
            理想のパートナー像
          </h3>
          <p className="text-sm text-text-light">
            恋愛・結婚・生活における相性の良いタイプと出会いのヒントを提案します。
          </p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-border">
          <h3 className="font-medium text-warm-800 mb-1">
            AIによる長文レポート
          </h3>
          <p className="text-sm text-text-light">
            温かく共感的なカウンセラー調で、あなただけの詳細なフィードバックを生成します。
          </p>
        </div>
      </div>

      <div className="bg-warm-100 rounded-xl p-4 mb-8">
        <ul className="space-y-2 text-sm text-text-light">
          <li>&#9201; 所要時間：約10〜15分</li>
          <li>&#128221; 全100問（10問ずつ回答）</li>
          <li>&#128190; 途中保存可能。いつでも再開できます</li>
          <li>&#128161; 正解・不正解はありません。直感で答えてOKです</li>
        </ul>
      </div>

      <div className="mt-auto space-y-3">
        <Button size="lg" onClick={() => router.push("/profile")}>
          プロフィール入力へ
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/diagnosis/1")}
        >
          スキップして診断を開始
        </Button>
      </div>
    </div>
  );
}
