"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ReportJson } from "@/types";
import { CATEGORY_MAP } from "@/config/categories";

interface ScoreData {
  categoryScores: Record<string, number>;
  mainType: string;
  subType: string;
  highCategories: string[];
  lowCategories: string[];
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<ReportJson | null>(null);
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareCode, setShareCode] = useState("");

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

  function handleDownloadJson() {
    if (!report || !scores) return;
    const data = { sessionId, report, scores, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `values-diagnosis-${shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
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
      {/* ヘッダー */}
      <div className="text-center bg-gradient-to-b from-warm-200 to-background rounded-2xl p-6 -mx-4 print:rounded-none print:bg-warm-100">
        <p className="text-xs text-text-muted mb-1">あなたの診断結果</p>
        <h1 className="text-xl font-bold text-warm-900 mb-1">{report.mainType}</h1>
        <p className="text-sm text-primary font-medium">{report.subType}</p>
        <p className="text-xs text-text-muted mt-2">共有コード: <span className="font-mono font-bold tracking-widest text-warm-700">{shareCode}</span></p>
      </div>

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
        <button
          onClick={handleDownloadJson}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-warm-50 border border-warm-200 text-warm-600 rounded-xl text-sm active:scale-95 transition-transform"
        >
          &#128190; データをダウンロード（JSON）
        </button>
      </div>

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
      <Section title={report.overallType.title}>
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
        <div className="space-y-4">
          {report.categoryFeedbacks.map((fb) => (
            <div key={fb.categoryId} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-warm-800">{fb.title}</h4>
                <span className="text-xs text-text-muted">
                  {fb.score >= 40 ? "とても強い" : fb.score >= 35 ? "強い" : fb.score >= 25 ? "ふつう" : fb.score >= 20 ? "おおらか" : "とてもおおらか"}
                </span>
              </div>
              <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{fb.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 理想のパートナー像 */}
      <Section title={report.idealPartnerAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.idealPartnerAnalysis.text}</p>
      </Section>

      {/* 相性TOP5 */}
      <Section title="相性の良いタイプ TOP5">
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

      {/* 出会いのヒント */}
      <Section title={report.encounterHints.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.encounterHints.text}</p>
      </Section>

      {/* お金観深層分析 */}
      <Section title={report.moneyAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.moneyAnalysis.text}</p>
      </Section>

      {/* 恋愛傾向・結婚観 */}
      <Section title={report.loveAndMarriageAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.loveAndMarriageAnalysis.text}</p>
      </Section>

      {/* 地域相性（新セクション） */}
      {report.regionalCompatibility && (
        <Section title={`&#127968; ${report.regionalCompatibility.title}`}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.regionalCompatibility.text}</p>
        </Section>
      )}

      {/* 四柱推命（新セクション） */}
      {report.fourPillarsInsight && (
        <Section title={`&#9654; ${report.fourPillarsInsight.title}`}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.fourPillarsInsight.text}</p>
        </Section>
      )}

      {/* パートナー比較の見方（新セクション） */}
      {report.partnerCheckGuide && (
        <Section title={`&#129309; ${report.partnerCheckGuide.title}`}>
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.partnerCheckGuide.text}</p>
        </Section>
      )}

      {/* カウンセラーメッセージ */}
      <div className="bg-warm-100 rounded-2xl p-5 border border-warm-300">
        <h3 className="text-base font-bold text-warm-800 mb-3">{report.counselorMessage.title}</h3>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{report.counselorMessage.text}</p>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border">
      <h3 className="text-base font-bold text-warm-800 mb-3" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
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
