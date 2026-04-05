"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

export default function TopPage() {
  const router = useRouter();
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vpd_sessionId");
    if (saved) setExistingSessionId(saved);
  }, []);

  async function handleStart(resume: boolean) {
    if (resume && existingSessionId) {
      setLoading(true);
      try {
        const res = await fetch(`/api/diagnosis/session/${existingSessionId}`);
        const data = await res.json();
        if (data.success) {
          const { status, nextSetNumber } = data.data;
          if (status === "result_generated") {
            router.push(`/result/${existingSessionId}`);
          } else if (status === "in_progress" || status === "completed") {
            router.push(`/diagnosis/${nextSetNumber}`);
          } else {
            router.push("/intro");
          }
          return;
        }
      } catch {
        // セッション取得失敗時は新規開始
      }
      setLoading(false);
    }

    // 新規セッション作成
    setLoading(true);
    try {
      const res = await fetch("/api/diagnosis/session", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("vpd_sessionId", data.data.sessionId);
        router.push("/intro");
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
          <span className="text-3xl text-white">&#9829;</span>
        </div>
        <h1 className="text-2xl font-bold text-warm-900 mb-2">
          価値観パートナー診断
        </h1>
        <p className="text-text-light text-sm leading-relaxed">
          100問の診断で、あなたの価値観と
          <br />
          理想のパートナー像を見える化します
        </p>
      </div>

      <div className="w-full bg-surface rounded-2xl p-5 mb-8 shadow-sm border border-border">
        <ul className="text-left space-y-3 text-sm text-text-light">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">&#10003;</span>
            <span>価値観・恋愛傾向・結婚観を言語化</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">&#10003;</span>
            <span>お金観・経済感覚を重点分析</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">&#10003;</span>
            <span>相性の良いパートナー像を提示</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">&#10003;</span>
            <span>AIによる長文レポートでフィードバック</span>
          </li>
        </ul>
      </div>

      <div className="w-full space-y-3">
        <Button
          size="lg"
          onClick={() => handleStart(false)}
          disabled={loading}
        >
          {loading ? "準備中..." : "診断をはじめる"}
        </Button>

        {existingSessionId && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleStart(true)}
            disabled={loading}
          >
            前回の続きから再開する
          </Button>
        )}
      </div>

      <p className="text-xs text-text-muted mt-6">所要時間：約10〜15分</p>

      {/* プライバシー注意書き */}
      <div className="w-full bg-warm-100 rounded-xl p-4 mt-4 border border-warm-200">
        <p className="text-xs text-text-muted leading-relaxed">
          &#128274; <span className="font-medium text-warm-700">プライバシーについて</span>
          <br />
          この診断で入力された情報やプロフィールは、診断結果の生成のみに使用されます。
          外部への送信・第三者への提供・マーケティング目的での利用は一切行いません。
          診断データはセッション単位で管理され、個人を特定する情報は収集していません。
        </p>
      </div>
    </div>
  );
}
