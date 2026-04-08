"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";

// ===== 型定義 =====

interface CategoryDiff {
  categoryId: string;
  label: string;
  scoreA: number;
  scoreB: number;
  diff: number;
  match: "high" | "mid" | "low";
}

interface QuestionDiff {
  questionId: string;
  categoryId: string;
  categoryLabel: string;
  questionText: string;
  answerA: number;
  answerB: number;
  effectiveDiff: number;
}

interface CompareResult {
  personA: {
    sessionId: string;
    shareCode: string;
    mainType: string;
    subType: string;
    profile: Record<string, string>;
  };
  personB: {
    sessionId: string;
    shareCode: string;
    mainType: string;
    subType: string;
    profile: Record<string, string>;
  };
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
  questionAnalysis: {
    bigGapQuestions: QuestionDiff[];
    closeQuestions: QuestionDiff[];
    categoryQuestionGaps: Record<string, { total: number; bigGaps: number }>;
  };
}

interface AIReportSection {
  title: string;
  text: string;
}

interface CompareAIReport {
  overallAnalysis: AIReportSection;
  strengthsAsCouple: AIReportSection;
  challengeAreas: AIReportSection;
  questionLevelInsight: AIReportSection;
  romanceAdvice: AIReportSection;
  marriageAdvice: AIReportSection;
  communicationTips: AIReportSection;
  profileCompatibility: AIReportSection;
  counselorMessage: AIReportSection;
}

const PROFILE_LABELS: Record<string, string> = {
  ageRange: "年代",
  gender: "性別",
  birthPlace: "出身地",
  currentResidence: "居住地",
  occupation: "職業",
  familyStructure: "家族構成",
  hobbies: "趣味",
  personalityType: "性格タイプ",
  transportation: "移動手段",
  clubActivity: "部活・スポーツ経験",
  beautyInterest: "美容関心",
  itLiteracy: "ITリテラシー",
  moneyLiteracy: "マネーリテラシー",
  financialHabit: "お金の使い方",
  foodPreference: "食の好み",
  snsUsage: "SNS利用",
  smartphone: "スマートフォン",
  favoriteMusic: "好きな音楽",
  friendCount: "友人の数",
  parentRelationship: "親との関係",
};

const ANSWER_LABELS: Record<number, string> = {
  1: "全く当てはまらない",
  2: "あまり当てはまらない",
  3: "どちらとも言えない",
  4: "当てはまる",
  5: "とても当てはまる",
};

// URLまたはセッションIDから純粋なIDを取り出す
function extractSessionId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/result\/([0-9a-f-]{36})/i);
  if (match) return match[1];
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return trimmed;
}

function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get("a") || "";

  const prefilledIdB = searchParams.get("b") || "";

  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [aiReport, setAiReport] = useState<CompareAIReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "result">("input");
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (prefilledId) setInputA(prefilledId);
    if (prefilledIdB) setInputB(prefilledIdB);
  }, [prefilledId, prefilledIdB]);

  // 両方のIDがURLにある場合は自動比較
  useEffect(() => {
    if (prefilledId && prefilledIdB && !result && !loading) {
      handleCompareAuto(prefilledId, prefilledIdB);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledId, prefilledIdB]);

  // AI相性レポートを取得
  const fetchAIReport = useCallback(async (idA: string, idB: string) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/diagnosis/compare/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idA, idB }),
      });
      const json = await res.json();
      if (json.success) {
        setAiReport(json.data.report);
      }
    } catch {
      // AI分析が失敗しても基本比較は表示済み
    }
    setAiLoading(false);
  }, []);

  async function handleCompareAuto(rawA: string, rawB: string) {
    const idA = extractSessionId(rawA);
    const idB = extractSessionId(rawB);
    if (!idA || !idB || idA === idB) return;
    setInputA(rawA);
    setInputB(rawB);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/diagnosis/compare?a=${idA}&b=${idB}`);
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStep("result");
        fetchAIReport(idA, idB);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  function handleShareCompare() {
    if (!result) return;
    const url = `${window.location.origin}/compare?a=${result.personA.sessionId}&b=${result.personB.sessionId}`;
    if (navigator.share) {
      navigator.share({
        title: "価値観パートナー相性診断の結果",
        text: `相性スコア: ${result.compatibilityScore}点`,
        url,
      });
    } else {
      handleCopyCompareLink();
    }
  }

  function handleCopyCompareLink() {
    if (!result) return;
    const url = `${window.location.origin}/compare?a=${result.personA.sessionId}&b=${result.personB.sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
    setAiReport(null);

    try {
      const res = await fetch(`/api/diagnosis/compare?a=${idA}&b=${idB}`);
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStep("result");
        // AI分析をバックグラウンドで開始
        fetchAIReport(idA, idB);
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

  const diffColor = (diff: number) => {
    if (diff >= 4) return "bg-red-500";
    if (diff >= 3) return "bg-orange-400";
    if (diff >= 2) return "bg-yellow-400";
    return "bg-green-400";
  };

  // ===== 結果画面 =====
  if (step === "result" && result) {
    const qa = result.questionAnalysis;

    return (
      <div className="flex flex-col gap-6 pb-12">
        {/* ヘッダー: 総合スコア */}
        <div className={`text-center bg-gradient-to-b ${scoreBg(result.compatibilityScore)} rounded-2xl p-6 -mx-4 border`}>
          <p className="text-xs text-text-muted mb-3">相性診断結果</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-center flex-1">
              <p className="text-xs text-text-muted mb-1">Aさん</p>
              <p className="text-xs font-bold text-warm-800 leading-tight">{result.personA.mainType}</p>
            </div>
            <span className="text-2xl flex-shrink-0">&#129309;</span>
            <div className="text-center flex-1">
              <p className="text-xs text-text-muted mb-1">Bさん</p>
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

        {/* AI分析レポート */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <h3 className="text-base font-bold text-warm-800 mb-3">&#129302; AI相性分析レポート</h3>
          {aiLoading && (
            <div className="flex items-center gap-2 text-text-muted py-4">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">AIが2人の相性を分析中...</span>
            </div>
          )}
          {aiReport && (
            <div className="space-y-4">
              {[
                aiReport.overallAnalysis,
                aiReport.strengthsAsCouple,
                aiReport.challengeAreas,
                aiReport.questionLevelInsight,
                aiReport.romanceAdvice,
                aiReport.marriageAdvice,
                aiReport.communicationTips,
                aiReport.profileCompatibility,
                aiReport.counselorMessage,
              ].map((section) => (
                <div key={section.title} className="bg-warm-50 rounded-xl p-4 border border-warm-200">
                  <h4 className="text-sm font-bold text-warm-800 mb-2">{section.title}</h4>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{section.text}</p>
                </div>
              ))}
            </div>
          )}
          {!aiLoading && !aiReport && (
            <p className="text-sm text-text-muted py-2">AI分析を読み込めませんでした。</p>
          )}
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

        {/* 質問レベルの大きなズレ */}
        {qa.bigGapQuestions.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <h3 className="text-base font-bold text-warm-800 mb-2">&#128680; 質問レベルで大きなズレがある項目</h3>
            <p className="text-xs text-text-light mb-3">
              個別の質問で回答差が3以上＝価値観が大きく異なるポイントです。カテゴリスコア以上に注目すべき差です。
            </p>
            <div className="space-y-3">
              {(showAllQuestions ? qa.bigGapQuestions : qa.bigGapQuestions.slice(0, 5)).map((q) => (
                <div key={q.questionId} className="bg-warm-50 rounded-xl p-3 border border-warm-200">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-warm-800 flex-1">{q.questionText}</p>
                    <span className={`text-xs font-bold text-white rounded-full px-2 py-0.5 shrink-0 ${diffColor(q.effectiveDiff)}`}>
                      差{q.effectiveDiff}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-1">カテゴリ: {q.categoryLabel}</p>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-primary font-medium">A:</span>
                      <span className="text-text">{ANSWER_LABELS[q.answerA] || q.answerA}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-warm-500 font-medium">B:</span>
                      <span className="text-text">{ANSWER_LABELS[q.answerB] || q.answerB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {qa.bigGapQuestions.length > 5 && (
              <button
                onClick={() => setShowAllQuestions(!showAllQuestions)}
                className="text-xs text-primary font-medium mt-3 hover:underline"
              >
                {showAllQuestions ? "閉じる" : `他${qa.bigGapQuestions.length - 5}件を表示`}
              </button>
            )}
          </div>
        )}

        {/* 価値観が一致している質問 */}
        {qa.closeQuestions.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <h3 className="text-base font-bold text-warm-800 mb-2">&#9989; 価値観が一致している質問</h3>
            <p className="text-xs text-text-light mb-3">回答差が0〜1＝同じ方向の価値観を持っています。</p>
            <div className="space-y-2">
              {qa.closeQuestions.map((q) => (
                <div key={q.questionId} className="flex items-center gap-2 bg-green-50 rounded-lg p-2.5 border border-green-200">
                  <span className="text-green-600 text-xs shrink-0">&#10003;</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-warm-800">{q.questionText}</p>
                    <p className="text-xs text-text-muted">{q.categoryLabel} — A:{q.answerA} / B:{q.answerB}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 特に相性が良いカテゴリ */}
        {result.strongMatches.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <h3 className="text-base font-bold text-warm-800 mb-3">&#9989; スコアが近いカテゴリ</h3>
            <div className="space-y-3">
              {result.strongMatches.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-800">{cat.label}</p>
                    <p className="text-xs text-text-muted">A {cat.scoreA}点 / B {cat.scoreB}点</p>
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
                    <p className="text-xs text-text-muted">A {cat.scoreA}点 / B {cat.scoreB}点</p>
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
              const gaps = qa.categoryQuestionGaps[cat.categoryId];
              return (
                <div key={cat.categoryId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-warm-800">{cat.label}</span>
                      {gaps && gaps.bigGaps > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-1">
                          質問ズレ{gaps.bigGaps}件
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${ms.cls}`}>{ms.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-6 shrink-0">A</span>
                      <div className="flex-1 bg-warm-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pctA}%` }} />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">{cat.scoreA}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-6 shrink-0">B</span>
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

        {/* プロフィール比較 */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-base font-bold text-warm-800">&#128100; プロフィール比較</h3>
            <span className="text-xs text-primary">{showProfile ? "閉じる ▲" : "開く ▼"}</span>
          </button>
          {showProfile && (
            <div className="mt-4 space-y-2">
              {Object.keys(PROFILE_LABELS).map((key) => {
                const valA = result.personA.profile[key];
                const valB = result.personB.profile[key];
                if (!valA && !valB) return null;
                const isSame = valA === valB && valA;
                return (
                  <div key={key} className={`rounded-lg p-2.5 border ${isSame ? "bg-green-50 border-green-200" : "bg-warm-50 border-warm-200"}`}>
                    <p className="text-xs font-medium text-warm-700 mb-1">
                      {PROFILE_LABELS[key]}
                      {isSame && <span className="text-green-600 ml-1">&#10003; 一致</span>}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div className="flex-1">
                        <span className="text-primary font-medium">A: </span>
                        <span className="text-text">{valA || "未入力"}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-warm-500 font-medium">B: </span>
                        <span className="text-text">{valB || "未入力"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 共有 */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <h3 className="text-base font-bold text-warm-800 mb-3">&#128279; この結果を共有</h3>
          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={handleShareCompare}
              className="flex-1"
            >
              {copied ? "コピー済み！" : "結果を共有する"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCompareLink}
              className="flex-1"
            >
              {copied ? "&#10003; コピー済み" : "URLをコピー"}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            共有URLを開くと、同じ比較結果を表示できます。
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <Button variant="secondary" onClick={() => { setStep("input"); setResult(null); setAiReport(null); setShowAllQuestions(false); setShowProfile(false); setCopied(false); }}>
            別の相手と比較する
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            トップに戻る
          </Button>
        </div>
      </div>
    );
  }

  // ===== 入力画面 =====
  return (
    <div className="flex flex-col min-h-[80vh]">
      <h1 className="text-xl font-bold text-warm-900 mb-2">&#129309; パートナー相性比較</h1>
      <p className="text-sm text-text-light mb-6 leading-relaxed">
        お互いの結果ページのURLを入力すると、100問の個別回答・プロフィールを含めた詳細な相性分析ができます。
      </p>

      <div className="space-y-5 mb-8">
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <label className="block text-sm font-medium text-warm-700 mb-2">
            Aさんの結果URL
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
            Bさんの結果URL
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
          &#128274; URLから取得される情報は、相性分析のためにのみ使用されます。AIが100問すべての回答とプロフィールを比較分析します。
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
