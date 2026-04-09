"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function GeneratingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("スコアを集計しています...");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const generating = useRef(false);

  useEffect(() => {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    if (generating.current) return;
    generating.current = true;

    generateReport(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function generateReport(sessionId: string) {
    setError(null);
    setStatus("AIが診断レポートを生成しています...");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const res = await fetch(
        `/api/diagnosis/session/${sessionId}/generate-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRegenerate: false }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      const json = await res.json();
      if (json.success) {
        setStatus("完了しました！結果画面へ移動します...");
        setTimeout(() => {
          router.push(`/result/${sessionId}`);
        }, 1000);
        return;
      } else {
        setError(json.error || "レポート生成に失敗しました");
      }
    } catch (e) {
      // タイムアウトまたはネットワークエラーの場合、レポートが完了しているか確認
      if (e instanceof DOMException && e.name === "AbortError") {
        setStatus("生成に時間がかかっています。結果を確認中...");
        // サーバー側では生成が完了している可能性があるので確認
        await checkForExistingReport(sessionId);
        return;
      }
      setError("レポート生成中にエラーが発生しました");
    }
  }

  async function checkForExistingReport(sessionId: string) {
    // 少し待ってからレポートの存在を確認
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`/api/diagnosis/session/${sessionId}/report`);
      const json = await res.json();
      if (json.success && json.data?.report) {
        setStatus("完了しました！結果画面へ移動します...");
        setTimeout(() => {
          router.push(`/result/${sessionId}`);
        }, 1000);
        return;
      }
    } catch {
      // ignore
    }
    setError("生成に時間がかかっています。下のボタンから再試行してください。");
  }

  function handleRetry() {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) return;
    setRetryCount((c) => c + 1);
    generateReport(sessionId);
  }

  function handleCheckResult() {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) return;
    router.push(`/result/${sessionId}`);
  }

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
            <div className="flex flex-col gap-3">
              {retryCount < 3 && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
                >
                  再試行する（{3 - retryCount}回まで）
                </button>
              )}
              <button
                onClick={handleCheckResult}
                className="px-6 py-3 bg-warm-100 border border-warm-300 text-warm-700 rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                結果ページを確認する
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-primary underline text-sm"
              >
                ページを再読み込み
              </button>
            </div>
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
