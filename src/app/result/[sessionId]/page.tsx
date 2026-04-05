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

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(
          `/api/diagnosis/session/${sessionId}/report`
        );
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
    <div className="flex flex-col gap-6 pb-12">
      {/* ヘッダー */}
      <div className="text-center bg-gradient-to-b from-warm-200 to-background rounded-2xl p-6 -mx-4">
        <p className="text-xs text-text-muted mb-1">あなたの診断結果</p>
        <h1 className="text-xl font-bold text-warm-900 mb-1">
          {report.mainType}
        </h1>
        <p className="text-sm text-primary font-medium">
          {report.subType}
        </p>
      </div>

      {/* 全体タイプ解説 */}
      <Section title={report.overallType.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.overallType.text}
        </p>
      </Section>

      {/* スコアチャート */}
      {scores && (
        <Section title="カテゴリ別スコア">
          <div className="space-y-3">
            {Object.entries(scores.categoryScores).map(([catId, score]) => {
              const label = CATEGORY_MAP[catId]?.label || catId;
              const percentage = Math.round(((score - 10) / 40) * 100);
              const isHigh = scores.highCategories.includes(catId);
              return (
                <div key={catId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`${isHigh ? "font-bold text-primary" : "text-text-light"}`}>
                      {label}
                    </span>
                    <span className="text-text-muted">{score}/50</span>
                  </div>
                  <div className="w-full bg-warm-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHigh ? "bg-primary" : "bg-warm-400"
                      }`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
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
          <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
            {item.text}
          </p>
        </Section>
      ))}

      {/* 10カテゴリ別フィードバック */}
      <Section title="カテゴリ別フィードバック">
        <div className="space-y-4">
          {report.categoryFeedbacks.map((fb) => (
            <div key={fb.categoryId} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-warm-800">
                  {fb.title}
                </h4>
                <span className="text-xs text-text-muted">
                  {fb.score}/50
                </span>
              </div>
              <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
                {fb.text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 理想のパートナー像 */}
      <Section title={report.idealPartnerAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.idealPartnerAnalysis.text}
        </p>
      </Section>

      {/* 相性TOP5 */}
      <Section title="相性の良いタイプ TOP5">
        <div className="space-y-4">
          <CompatibilityList title="恋愛相性" items={report.compatibilityTop5.romance} />
          <CompatibilityList title="結婚相性" items={report.compatibilityTop5.marriage} />
          <CompatibilityList title="ビジネス相性" items={report.compatibilityTop5.business} />
        </div>
      </Section>

      {/* 出会いのヒント */}
      <Section title={report.encounterHints.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.encounterHints.text}
        </p>
      </Section>

      {/* お金観深層分析 */}
      <Section title={report.moneyAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.moneyAnalysis.text}
        </p>
      </Section>

      {/* 恋愛傾向・結婚観 */}
      <Section title={report.loveAndMarriageAnalysis.title}>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.loveAndMarriageAnalysis.text}
        </p>
      </Section>

      {/* カウンセラーメッセージ */}
      <div className="bg-warm-100 rounded-2xl p-5 border border-warm-300">
        <h3 className="text-base font-bold text-warm-800 mb-3">
          {report.counselorMessage.title}
        </h3>
        <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">
          {report.counselorMessage.text}
        </p>
      </div>

      {/* フッター */}
      <div className="text-center mt-4">
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border">
      <h3
        className="text-base font-bold text-warm-800 mb-3"
        dangerouslySetInnerHTML={{ __html: title }}
      />
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
          <div
            key={item.rank}
            className="flex items-start gap-2 text-sm"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warm-200 text-warm-700 text-xs font-bold flex items-center justify-center">
              {item.rank}
            </span>
            <div>
              <span className="font-medium text-warm-800">
                {item.typeName}
              </span>
              <p className="text-text-light text-xs mt-0.5">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
