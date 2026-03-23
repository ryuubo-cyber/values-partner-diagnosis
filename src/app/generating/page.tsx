"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("スコアを集計しています...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    async function generateReport() {
      try {
        setStatus("AIが診断レポートを生成しています...");

        const res = await fetch(
          `/api/diagnosis/session/${sessionId}/generate-report`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forceRegenerate: false }),
          }
        );

        const json = await res.json();
        if (json.success) {
          setStatus("完了しました！結果画面へ移動します...");
          setTimeout(() => {
            router.push(`/result/${sessionId}`);
          }, 1000);
        } else {
          setError(json.error || "レポート生成に失敗しました");
        }
      } catch {
        setError("レポート生成中にエラーが発生しました");
      }
    }

    generateReport();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-200 flex items-center justify-center animate-pulse">
          <span className="text-2xl">&#9997;</span>
        </div>

        {error ? (
          <>
            <h2 className="text-lg font-bold text-warm-900 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-sm text-red-500 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary underline text-sm"
            >
              再試行する
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-warm-900 mb-2">
              診断結果を生成中
            </h2>
            <p className="text-sm text-text-light mb-4">{status}</p>
            <p className="text-xs text-text-muted">
              少々お待ちください（最大1分程度）
            </p>

            {/* ローディングアニメーション */}
            <div className="flex justify-center gap-1.5 mt-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
