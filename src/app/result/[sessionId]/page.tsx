"use client";

import { useEffect, useState, use, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ReportJson } from "@/types";
import { CATEGORY_MAP } from "@/config/categories";

const DeepDiveChat = lazy(() => import("@/components/DeepDiveChat"));

interface ScoreData {
  categoryScores: Record<string, number>;
  mainType: string;
  subType: string;
  highCategories: string[];
  lowCategories: string[];
}

interface AnswerItem {
  questionId: string;
  categoryId: string;
  categoryLabel: string;
  questionText: string;
  answer: number | null;
  reverseScore: boolean;
}

const ANSWER_LABELS = ["", "まったくあてはまらない", "あまりあてはまらない", "どちらともいえない", "ややあてはまる", "とてもあてはまる"];

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<ReportJson | null>(null);
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [answers, setAnswers] = useState<AnswerItem[] | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<{ title: string; text: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const MAX_REGENERATE = 3;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    // セッションIDの下6桁を共有コードとして使用
    setShareCode(sessionId.slice(-6).toUpperCase());

    async function fetchReport() {
      try {
        const res = await fetch(`/api/diagnosis/session/${sessionId}/report`);
        const json = await res.json();
        if (json.success) {
          setReport(json.data.report);
          setScores(json.data.scores);
          if (json.data.profile) setProfile(json.data.profile);
        } else {
          setError(json.error);
        }
      } catch {
        setError("結果の取得に失敗しました");
      }
      setLoading(false);
    }

    fetchReport();
  }, [sessionId]);

  function handleCopyLink() {
    const url = `${window.location.origin}/result/${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    const url = `${window.location.origin}/result/${sessionId}`;
    if (navigator.share) {
      navigator.share({
        title: "価値観パートナー診断の結果",
        text: `私の診断タイプは「${report?.mainType}」でした！`,
        url,
      });
    } else {
      handleCopyLink();
    }
  }

  async function handleLoadAnswers() {
    if (answers) { setShowAnswers(!showAnswers); return; }
    setLoadingAnswers(true);
    try {
      const res = await fetch(`/api/diagnosis/session/${sessionId}/answers-all`);
      const json = await res.json();
      if (json.success) {
        setAnswers(json.data.answers);
        setShowAnswers(true);
      }
    } catch { /* ignore */ }
    setLoadingAnswers(false);
  }

  function handleDownloadJson() {
    if (!report || !scores) return;
    const data = { sessionId, report, scores, answers, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `values-diagnosis-${shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadAnswersCsv() {
    if (!answers) return;
    const header = "質問ID,カテゴリ,質問,回答(1-5),回答テキスト,逆転項目";
    const rows = answers.map(a =>
      `"${a.questionId}","${a.categoryLabel}","${a.questionText.replace(/"/g, '""')}",${a.answer || ""},${a.answer ? `"${ANSWER_LABELS[a.answer]}"` : ""},${a.reverseScore ? "○" : ""}`
    );
    const csv = [header, ...rows].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `values-answers-${shareCode}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  function openDeepDive(title?: string, text?: string) {
    if (title && text) {
      setChatContext({ title, text });
    } else {
      setChatContext(null);
    }
    setChatOpen(true);
  }

  async function handleRegenerate() {
    if (regenerating) return;
    if (regenerateCount >= MAX_REGENERATE) {
      alert(`再生成は${MAX_REGENERATE}回までです。`);
      return;
    }
    if (!confirm("診断結果を再生成しますか？AIが別の切り口で新しい結果を作成します。")) return;
    setRegenerating(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const res = await fetch(
        `/api/diagnosis/session/${sessionId}/generate-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRegenerate: true }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      const json = await res.json();
      if (json.success) {
        setRegenerateCount(prev => prev + 1);
        // 新しいレポートを取得
        const reportRes = await fetch(`/api/diagnosis/session/${sessionId}/report`);
        const reportJson = await reportRes.json();
        if (reportJson.success) {
          setReport(reportJson.data.report);
          setScores(reportJson.data.scores);
          if (reportJson.data.profile) setProfile(reportJson.data.profile);
        }
      } else {
        alert(json.error || "再生成に失敗しました");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // タイムアウトしたが、サーバー側で生成完了している可能性がある
        // 少し待ってからレポートの再取得を試みる
        await new Promise(r => setTimeout(r, 3000));
        try {
          const reportRes = await fetch(`/api/diagnosis/session/${sessionId}/report`);
          const reportJson = await reportRes.json();
          if (reportJson.success) {
            setRegenerateCount(prev => prev + 1);
            setReport(reportJson.data.report);
            setScores(reportJson.data.scores);
            setRegenerating(false);
            return;
          }
        } catch { /* ignore */ }
        alert("生成に時間がかかっています。ページを再読み込みしてください。");
      } else {
        alert("再生成中にエラーが発生しました");
      }
    }
    setRegenerating(false);
  }

  function toggleCategory(catId: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-light animate-pulse">結果を読み込み中...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-text-light mb-4">{error || "結果が見つかりません"}</p>
        <Button onClick={() => router.push("/")}>トップに戻る</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 print:gap-4">
      {/* 深掘りチャット */}
      {chatOpen && (
        <Suspense fallback={null}>
          <DeepDiveChat
            sessionId={sessionId}
            sectionContext={chatContext?.text}
            sectionTitle={chatContext?.title}
            onClose={() => setChatOpen(false)}
          />
        </Suspense>
      )}

      {/* ヘッダー */}
      <div className="text-center bg-gradient-to-b from-warm-200 to-background rounded-2xl p-6 -mx-4 print:rounded-none print:bg-warm-100">
        <p className="text-xs text-text-muted mb-1">あなたの診断結果</p>
        <h1 className="text-xl font-bold text-warm-900 mb-1">{report.mainType}</h1>
        <p className="text-sm text-primary font-medium">{report.subType}</p>
        <p className="text-xs text-text-muted mt-2">共有コード: <span className="font-mono font-bold tracking-widest text-warm-700">{shareCode}</span></p>
      </div>

      {/* プロフィール表示 */}
      {Object.keys(profile).length > 0 && (
        <ProfileSection profile={profile} />
      )}

      {/* エクスポート・共有ボタン */}
      <div className="flex flex-col gap-2 print:hidden">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-primary text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            &#128279; {copied ? "コピー済み！" : "結果を共有"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-warm-100 border border-warm-300 text-warm-700 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            &#128438; 印刷・PDF保存
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadJson}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-warm-50 border border-warm-200 text-warm-600 rounded-xl text-sm active:scale-95 transition-transform"
          >
            &#128190; データDL（JSON）
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-warm-50 border border-warm-200 text-warm-600 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            &#128260; {regenerating ? "再生成中..." : regenerateCount >= MAX_REGENERATE ? "再生成上限" : `再生成（残${MAX_REGENERATE - regenerateCount}回）`}
          </button>
        </div>
      </div>

      {/* AIに深掘りで聞くボタン */}
      <button
        onClick={() => openDeepDive()}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-primary/90 to-primary text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform shadow-sm print:hidden"
      >
        <span className="text-lg">&#128172;</span>
        この診断結果をAIに深掘りして聞く
      </button>

      {/* パートナー比較セクション */}
      <div className="bg-warm-50 rounded-2xl p-5 border-2 border-warm-300 print:hidden">
        <h3 className="text-base font-bold text-warm-800 mb-2">&#129309; パートナーと相性を比較する</h3>
        <p className="text-xs text-text-light mb-3 leading-relaxed">
          パートナー候補にも診断を受けてもらい、それぞれの共有コードを入力すると相性を分析できます。
        </p>
        <div className="bg-white rounded-xl p-3 border border-warm-200 mb-3">
          <p className="text-xs text-text-muted mb-1">あなたの共有コード</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-widest text-primary">{shareCode}</span>
            <button
              onClick={handleCopyLink}
              className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 active:scale-95 transition-transform"
            >
              {copied ? "✓" : "コピー"}
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/compare?a=${sessionId}`)}
        >
          相性比較ページへ →
        </Button>
      </div>

      {/* 全体タイプ解説 */}
      <Section title={report.overallType.title} onDeepDive={() => openDeepDive(report.overallType.title, report.overallType.text)}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.overallType.text}</p>
      </Section>

      {/* スコアチャート */}
      {scores && (
        <Section title="カテゴリ別 こだわりの強さ">
          <p className="text-xs text-text-muted mb-3">
            スコアが高い＝良いではありません。こだわりの強さ・関心の度合いを表しています。
          </p>
          <div className="space-y-3">
            {Object.entries(scores.categoryScores).map(([catId, score]) => {
              const label = CATEGORY_MAP[catId]?.label || catId;
              const percentage = Math.round(((score - 10) / 40) * 100);
              const isHigh = scores.highCategories.includes(catId);
              const isLow = scores.lowCategories.includes(catId);
              const tendencyLabel = score >= 40 ? "とても強い" : score >= 35 ? "強い" : score >= 25 ? "ふつう" : score >= 20 ? "おおらか" : "とてもおおらか";
              return (
                <div key={catId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isHigh ? "font-bold text-primary" : isLow ? "text-warm-400" : "text-text-light"}>{label}</span>
                    <span className="text-text-muted">{tendencyLabel}</span>
                  </div>
                  <div className="w-full bg-warm-200 rounded-full h-2 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-primary" : isLow ? "bg-warm-300" : "bg-warm-400"}`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-muted mt-0.5 opacity-50">
                    <span>おおらか</span>
                    <span>こだわり強い</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 高得点カテゴリ深掘り */}
      {report.highScoreDeepDive.map((item) => (
        <Section key={item.categoryId} title={`&#11088; ${item.title}`}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{item.text}</p>
        </Section>
      ))}

      {/* 10カテゴリ別フィードバック */}
      <Section title="カテゴリ別フィードバック">
        <div className="space-y-3">
          {report.categoryFeedbacks.map((fb) => {
            const isExpanded = expandedCategories.has(fb.categoryId);
            return (
              <div key={fb.categoryId} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(fb.categoryId)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-warm-50/50 text-left active:bg-warm-100 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-warm-800 truncate">{fb.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-text-muted">
                      {fb.score >= 40 ? "とても強い" : fb.score >= 35 ? "強い" : fb.score >= 25 ? "ふつう" : fb.score >= 20 ? "おおらか" : "とてもおおらか"}
                    </span>
                    <span className="text-xs text-primary">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-border">
                    <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                    <button
                      onClick={() => openDeepDive(fb.title, fb.text)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium active:scale-95 transition-transform print:hidden"
                    >
                      <span>&#128172;</span> このカテゴリを深掘りする
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 理想のパートナー像 */}
      <Section title={report.idealPartnerAnalysis.title} onDeepDive={() => openDeepDive(report.idealPartnerAnalysis.title, report.idealPartnerAnalysis.text)}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.idealPartnerAnalysis.text}</p>
      </Section>

      {/* 相性分析（ナラティブ形式） */}
      {report.compatibilityAnalysis && (
        <>
          <Section title={report.compatibilityAnalysis.romance.title} onDeepDive={() => openDeepDive(report.compatibilityAnalysis.romance.title, report.compatibilityAnalysis.romance.text)}>
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityAnalysis.romance.text}</p>
          </Section>
          <Section title={report.compatibilityAnalysis.marriage.title} onDeepDive={() => openDeepDive(report.compatibilityAnalysis.marriage.title, report.compatibilityAnalysis.marriage.text)}>
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityAnalysis.marriage.text}</p>
          </Section>
          <Section title={report.compatibilityAnalysis.business.title} onDeepDive={() => openDeepDive(report.compatibilityAnalysis.business.title, report.compatibilityAnalysis.business.text)}>
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityAnalysis.business.text}</p>
          </Section>
          <Section title={report.compatibilityAnalysis.friendship.title} onDeepDive={() => openDeepDive(report.compatibilityAnalysis.friendship.title, report.compatibilityAnalysis.friendship.text)}>
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityAnalysis.friendship.text}</p>
          </Section>
          <Section title={report.compatibilityAnalysis.client.title} onDeepDive={() => openDeepDive(report.compatibilityAnalysis.client.title, report.compatibilityAnalysis.client.text)}>
            <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityAnalysis.client.text}</p>
          </Section>
        </>
      )}

      {/* 旧形式の相性TOP5（後方互換） */}
      {!report.compatibilityAnalysis && report.compatibilityTop5 && (
        <Section title="相性の良いタイプ">
          <div className="space-y-5">
            <CompatibilityList title="&#10084; 恋愛相性" items={report.compatibilityTop5.romance} />
            <CompatibilityList title="&#128149; 結婚相性" items={report.compatibilityTop5.marriage} />
            <CompatibilityList title="&#128188; ビジネス相性" items={report.compatibilityTop5.business} />
            {report.compatibilityTop5.friendship && (
              <CompatibilityList title="&#128101; 友人相性" items={report.compatibilityTop5.friendship} />
            )}
            {report.compatibilityTop5.client && (
              <CompatibilityList title="&#129309; クライアント相性" items={report.compatibilityTop5.client} />
            )}
          </div>
        </Section>
      )}

      {/* 相性のまとめ（ナラティブ） */}
      {report.compatibilityNarrative && (
        <Section title={report.compatibilityNarrative.title} onDeepDive={() => openDeepDive(report.compatibilityNarrative!.title, report.compatibilityNarrative!.text)}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.compatibilityNarrative.text}</p>
        </Section>
      )}

      {/* 出会いのヒント */}
      <Section title={report.encounterHints.title} onDeepDive={() => openDeepDive(report.encounterHints.title, report.encounterHints.text)}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.encounterHints.text}</p>
      </Section>

      {/* お金観深層分析 */}
      <Section title={report.moneyAnalysis.title} onDeepDive={() => openDeepDive(report.moneyAnalysis.title, report.moneyAnalysis.text)}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.moneyAnalysis.text}</p>
      </Section>

      {/* 恋愛傾向・結婚観 */}
      <Section title={report.loveAndMarriageAnalysis.title} onDeepDive={() => openDeepDive(report.loveAndMarriageAnalysis.title, report.loveAndMarriageAnalysis.text)}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.loveAndMarriageAnalysis.text}</p>
      </Section>

      {/* 地域相性（新セクション） */}
      {report.regionalCompatibility && (
        <Section title={`&#127968; ${report.regionalCompatibility.title}`} onDeepDive={() => openDeepDive(report.regionalCompatibility.title, report.regionalCompatibility.text)}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.regionalCompatibility.text}</p>
        </Section>
      )}

      {/* 四柱推命（新セクション） */}
      {report.fourPillarsInsight && (
        <Section title={`&#9654; ${report.fourPillarsInsight.title}`} onDeepDive={() => openDeepDive(report.fourPillarsInsight.title, report.fourPillarsInsight.text)}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.fourPillarsInsight.text}</p>
        </Section>
      )}

      {/* パートナー比較の見方（新セクション） */}
      {report.partnerCheckGuide && (
        <Section title={`&#129309; ${report.partnerCheckGuide.title}`} onDeepDive={() => openDeepDive(report.partnerCheckGuide.title, report.partnerCheckGuide.text)}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.partnerCheckGuide.text}</p>
        </Section>
      )}

      {/* カウンセラーメッセージ */}
      <div className="bg-warm-100 rounded-2xl p-5 border border-warm-300">
        <h3 className="text-base font-bold text-warm-800 mb-3">{report.counselorMessage.title}</h3>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.counselorMessage.text}</p>
      </div>

      {/* 100問の回答一覧 */}
      <div className="print:hidden">
        <button
          onClick={handleLoadAnswers}
          className="w-full bg-surface rounded-2xl p-4 border border-border text-left"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-warm-800">&#128221; 100問の回答を確認する</h3>
            <span className="text-xs text-primary">{showAnswers ? "閉じる ▲" : loadingAnswers ? "読み込み中..." : "開く ▼"}</span>
          </div>
        </button>
        {showAnswers && answers && (
          <div className="bg-surface rounded-b-2xl border border-t-0 border-border p-4 -mt-2">
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleDownloadAnswersCsv}
                className="flex-1 px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-700 active:scale-95 transition-transform"
              >
                &#128190; CSVダウンロード
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-700 active:scale-95 transition-transform"
              >
                &#128190; JSONダウンロード
              </button>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {answers.map((a, i) => {
                const isNewCategory = i === 0 || a.categoryId !== answers[i - 1].categoryId;
                return (
                  <div key={a.questionId}>
                    {isNewCategory && (
                      <div className="sticky top-0 bg-warm-100 text-xs font-bold text-warm-700 px-2 py-1.5 rounded mt-2 first:mt-0">
                        {a.categoryLabel}
                      </div>
                    )}
                    <div className="flex gap-2 py-2 border-b border-border/50 text-xs">
                      <span className="flex-1 text-text-light">{a.questionText}</span>
                      <span className={`flex-shrink-0 w-16 text-right font-medium ${
                        a.answer === null ? "text-text-muted" :
                        a.answer >= 4 ? "text-primary" :
                        a.answer <= 2 ? "text-warm-400" : "text-text-light"
                      }`}>
                        {a.answer !== null ? ANSWER_LABELS[a.answer] : "未回答"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="flex flex-col gap-3 mt-4 print:hidden">
        <Button variant="secondary" onClick={handleShare}>
          &#128279; この結果を共有する
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("vpd_sessionId");
            router.push("/");
          }}
        >
          新しく診断を受ける
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children, onDeepDive }: { title: string; children: React.ReactNode; onDeepDive?: () => void }) {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border">
      <h3 className="text-base font-bold text-warm-800 mb-3" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
      {onDeepDive && (
        <button
          onClick={onDeepDive}
          className="mt-4 flex items-center gap-1.5 text-xs text-primary font-medium active:scale-95 transition-transform print:hidden"
        >
          <span>&#128172;</span> ここを深掘りして聞く
        </button>
      )}
    </div>
  );
}

const PROFILE_LABELS: Record<string, string> = {
  birthDate: "生年月日",
  gender: "性別",
  ageRange: "年代",
  birthPlace: "出身地域",
  currentResidence: "現在の住まい",
  occupation: "職業",
  familyStructure: "暮らし方",
  lifestyle: "休日の過ごし方",
  snsUsage: "よく使うSNS",
  foodPreference: "食の傾向",
  financialHabit: "お金の使い方",
  friendCount: "友人関係",
  parentRelationship: "親との関係",
};

function ProfileSection({ profile }: { profile: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(profile).filter(
    ([key, val]) => val && PROFILE_LABELS[key]
  );
  if (entries.length === 0) return null;

  const preview = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="bg-warm-50 rounded-2xl p-4 border border-warm-200 print:bg-warm-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-bold text-warm-700">&#128100; あなたのプロフィール</h3>
        <span className="text-xs text-primary">{expanded ? "閉じる ▲" : "詳細 ▼"}</span>
      </button>
      <div className="mt-2 flex flex-wrap gap-2">
        {preview.map(([key, val]) => (
          <span key={key} className="inline-flex items-center gap-1 text-xs bg-white border border-warm-200 rounded-lg px-2 py-1 text-warm-700">
            <span className="text-text-muted">{PROFILE_LABELS[key]}:</span> {val}
          </span>
        ))}
        {!expanded && rest.length > 0 && (
          <span className="text-xs text-text-muted">+{rest.length}項目</span>
        )}
      </div>
      {expanded && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {rest.map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1 text-xs bg-white border border-warm-200 rounded-lg px-2 py-1 text-warm-700">
              <span className="text-text-muted">{PROFILE_LABELS[key]}:</span> {val}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CompatibilityList({
  title,
  items,
}: {
  title: string;
  items: Array<{ rank: number; typeName: string; reason: string }>;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-warm-700 mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.rank} className="flex items-start gap-2 text-sm">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warm-200 text-warm-700 text-xs font-bold flex items-center justify-center">
              {item.rank}
            </span>
            <div>
              <span className="font-medium text-warm-800">{item.typeName}</span>
              <p className="text-text-light text-xs mt-0.5">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
