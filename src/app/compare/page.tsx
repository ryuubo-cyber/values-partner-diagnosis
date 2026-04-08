"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";

interface CategoryDiff {
  categoryId: string;
  label: string;
  scoreA: number;
  scoreB: number;
  diff: number;
  match: "high" | "mid" | "low";
}

interface CompareResult {
  personA: { sessionId: string; shareCode: string; mainType: string; subType: string };
  personB: { sessionId: string; shareCode: string; mainType: string; subType: string };
  compatibilityScore: number;
  categoryDiffs: CategoryDiff[];
  strongMatches: CategoryDiff[];
  gapCategories: CategoryDiff[];
  relationScores: {
    romance: number;
    marriage: number;
    business: number;
    friendship: number;
    client: number;
  };
}

// URLまたはセッションIDから純粋なIDを取り出す
function extractSessionId(input: string): string {
  const trimmed = input.trim();
  // /result/xxxx-xxxx 形式のURLやパス
  const match = trimmed.match(/result\/([0-9a-f-]{36})/i);
  if (match) return match[1];
  // UUID形式そのまま
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return trimmed;
}

function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get("a") || "";

  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "result">("input");

  useEffect(() => {
    if (prefilledId) {
      setInputA(prefilledId);
    }
  }, [prefilledId]);

  async function handleCompare() {
    const idA = extractSessionId(inputA);
    const idB = extractSessionId(inputB);

    if (!idA || !idB) {
      setError("両方のURLまたはIDを入力してください");
      return;
    }
    if (idA === idB) {
      setError("同じセッションIDが入力されています");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/diagnosis/compare?a=${idA}&b=${idB}`);
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStep("result");
      } else {
        setError(json.error || "比較に失敗しました");
      }
    } catch {
      setError("比較処理に失敗しました");
    }
    setLoading(false);
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-primary";
    if (score >= 35) return "text-yellow-600";
    return "text-warm-500";
  };

  const scoreBg = (score: number) => {
    if (score >= 70) return "from-green-100 to-green-50 border-green-200";
    if (score >= 50) return "from-warm-200 to-background border-warm-300";
    if (score >= 35) return "from-yellow-100 to-yellow-50 border-yellow-200";
    return "from-warm-100 to-warm-50 border-warm-200";
  };

  const scoreLabel = (score: number) => {
    if (score >= 70) return "高い相性";
    if (score >= 50) return "まずまずの相性";
    if (score >= 35) return "やや差あり";
    return "差が大きい";
  };

  const matchStyle = (match: string) => {
    if (match === "high") return { label: "◎ 一致", cls: "text-green-600 bg-green-50 border-green-200" };
    if (match === "mid") return { label: "○ やや近い", cls: "text-primary bg-warm-50 border-warm-200" };
    return { label: "△ 要注意", cls: "text-red-500 bg-red-50 border-red-200" };
  };

  if (step === "result" && result) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        {/* ヘッダー */}
        <div className={`text-center bg-gradient-to-b ${scoreBg(result.compatibilityScore)} rounded-2xl p-6 -mx-4 border`}>
          <p className="text-xs text-text-muted mb-3">相性診断結果</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-center flex-1">
              <p className="text-xs text-text-muted mb-1">あなた</p>
              <p className="text-xs font-bold text-warm-800 leading-tight">{result.personA.mainType}</p>
            </div>
            <span className="text-2xl flex-shrink-0">&#129309;</span>
            <div className="text-center flex-1">
              <p className="text-xs text-text-muted mb-1">相手</p>
              <p className="text-xs font-bold text-warm-800 leading-tight">{result.personB.mainType}</p>
            </div>
          </div>
          <div className={`text-5xl font-bold mb-1 ${scoreColor(result.compatibilityScore)}`}>
            {result.compatibilityScore}<span className="text-2xl">点</span>
          </div>
          <p className={`text-sm font-medium mb-1 ${scoreColor(result.compatibilityScore)}`}>
            {scoreLabel(result.compatibilityScore)}
          </p>
          <p className="text-xs text-text-muted">総合相性スコア（70点以上で高い相性）</p>
        </div>

        {/* 関係タイプ別相性 */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <h3 className="text-base font-bold text-warm-800 mb-4">関係タイプ別の相性</h3>
          <p className="text-xs text-text-muted mb-3">70点以上 = 高い相性 / 50点以上 = まずまず / それ以下 = 差あり</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "恋愛", emoji: "❤️", score: result.relationScores.romance },
              { label: "結婚", emoji: "💍", score: result.relationScores.marriage },
              { label: "仕事", emoji: "💼", score: result.relationScores.business },
              { label: "友人", emoji: "👫", score: result.relationScores.friendship },
              { label: "クライアント", emoji: "🤝", score: result.relationScores.client },
            ].map(({ label, emoji, score }) => (
              <div key={label} className="bg-warm-50 rounded-xl p-3 text-center border border-warm-200">
                <div className="text-xl mb-1">{emoji}</div>
                <div className={`text-xl font-bold ${scoreColor(score)}`}>
                  {score}<span className="text-sm">点</span>
                </div>
                <div className="text-xs text-text-muted">{label}相性</div>
                <div className={`text-xs mt-0.5 ${scoreColor(score)}`}>{scoreLabel(score)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 特に相性の良いカテゴリ */}
        {result.strongMatches.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <h3 className="text-base font-bold text-warm-800 mb-3">&#9989; 価値観が近いカテゴリ</h3>
            <div className="space-y-3">
              {result.strongMatches.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-800">{cat.label}</p>
                    <p className="text-xs text-text-muted">あなた {cat.scoreA}点 / 相手 {cat.scoreB}点</p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                    差 {cat.diff}点
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 話し合いが必要なカテゴリ */}
        {result.gapCategories.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <h3 className="text-base font-bold text-warm-800 mb-2">&#128483; 話し合いが大切なカテゴリ</h3>
            <p className="text-xs text-text-light mb-3">差が大きくても、お互いを理解する機会になります。</p>
            <div className="space-y-3">
              {result.gapCategories.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-800">{cat.label}</p>
                    <p className="text-xs text-text-muted">あなた {cat.scoreA}点 / 相手 {cat.scoreB}点</p>
                  </div>
                  <span className="text-xs font-medium text-warm-600 bg-warm-100 border border-warm-200 rounded-full px-2 py-1">
                    差 {cat.diff}点
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* カテゴリ別スコア比較 */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <h3 className="text-base font-bold text-warm-800 mb-4">カテゴリ別スコア比較</h3>
          <div className="space-y-4">
            {result.categoryDiffs.map((cat) => {
              const ms = matchStyle(cat.match);
              const pctA = Math.max(Math.round(((cat.scoreA - 10) / 40) * 100), 2);
              const pctB = Math.max(Math.round(((cat.scoreB - 10) / 40) * 100), 2);
              return (
                <div key={cat.categoryId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-warm-800">{cat.label}</span>
                    <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${ms.cls}`}>{ms.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-10 shrink-0">あなた</span>
                      <div className="flex-1 bg-warm-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pctA}%` }} />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">{cat.scoreA}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-10 shrink-0">相手</span>
                      <div className="flex-1 bg-warm-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-warm-500" style={{ width: `${pctB}%` }} />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">{cat.scoreB}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setStep("input"); setResult(null); }}>
            別の相手と比較する
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            トップに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh]">
      <h1 className="text-xl font-bold text-warm-900 mb-2">&#129309; パートナー相性比較</h1>
      <p className="text-sm text-text-light mb-6 leading-relaxed">
        お互いの結果ページのURLを入力すると、価値観の相性を詳しく分析できます。
      </p>

      <div className="space-y-5 mb-8">
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <label className="block text-sm font-medium text-warm-700 mb-2">
            あなたの結果URL
          </label>
          {prefilledId ? (
            <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3 border border-green-200">
              <span className="text-green-600 text-sm">&#10003;</span>
              <span className="text-xs text-green-700 font-medium">あなたの結果がセット済みです</span>
            </div>
          ) : (
            <input
              type="text"
              placeholder="https://values-partner-diagnosis.vercel.app/result/..."
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          )}
        </div>

        <div className="text-center text-warm-400 text-xl">&#8646;</div>

        <div className="bg-surface rounded-2xl p-5 border border-border">
          <label className="block text-sm font-medium text-warm-700 mb-2">
            相手の結果URL
          </label>
          <input
            type="text"
            placeholder="https://values-partner-diagnosis.vercel.app/result/..."
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <p className="text-xs text-text-muted mt-2">
            相手に診断を受けてもらい、結果ページのURLを共有してもらってください
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-3">
        <Button size="lg" onClick={handleCompare} disabled={loading}>
          {loading ? "分析中..." : "相性を分析する"}
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.push("/")}>
          トップに戻る
        </Button>
      </div>

      <div className="mt-6 bg-warm-50 rounded-xl p-4 border border-warm-200">
        <p className="text-xs text-text-muted leading-relaxed">
          &#128274; URLから取得される情報は、相性分析のためにのみ使用されます。相手の詳細な回答内容は表示されません。
        </p>
      </div>
    </div>
  );
}

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-light animate-pulse">読み込み中...</div>
      </div>
    }>
      <ComparePage />
    </Suspense>
  );
}
