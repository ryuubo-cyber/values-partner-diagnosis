"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { AnswerScale } from "@/components/AnswerScale";
import { ProgressBar } from "@/components/ProgressBar";

interface QuestionData {
  questionId: string;
  displayOrder: number;
  questionText: string;
  existingAnswer: number | null;
}

interface QuestionsResponse {
  sessionId: string;
  setNumber: number;
  categoryId: string;
  categoryLabel: string;
  questions: QuestionData[];
}

const TOTAL_SETS = 10;
const QUESTIONS_PER_SET = 10;

export default function DiagnosisPage({
  params,
}: {
  params: Promise<{ set: string }>;
}) {
  const { set } = use(params);
  const setNumber = parseInt(set, 10);
  const router = useRouter();

  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    async function fetchQuestions() {
      try {
        const res = await fetch(
          `/api/diagnosis/session/${sessionId}/questions?set=${setNumber}`
        );
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          // 既存の回答をセット
          const existing: Record<string, number> = {};
          for (const q of json.data.questions) {
            if (q.existingAnswer) {
              existing[q.questionId] = q.existingAnswer;
            }
          }
          setAnswers(existing);
        } else {
          setError(json.error);
        }
      } catch {
        setError("質問の取得に失敗しました");
      }
      setLoading(false);
    }

    fetchQuestions();
  }, [setNumber, router]);

  function handleAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!data) return;
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) return;

    // 全問回答チェック
    const unanswered = data.questions.filter((q) => !answers[q.questionId]);
    if (unanswered.length > 0) {
      setError(`未回答の質問が${unanswered.length}問あります`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/diagnosis/session/${sessionId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setNumber,
            answers: data.questions.map((q) => ({
              questionId: q.questionId,
              answer: answers[q.questionId],
            })),
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        if (json.data.nextSetNumber) {
          router.push(`/diagnosis/${json.data.nextSetNumber}`);
        } else {
          // 全問完了 → 結果生成へ
          router.push("/generating");
        }
      } else {
        setError(json.error);
      }
    } catch {
      setError("回答の送信に失敗しました");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-light animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-text-light mb-4">{error || "データの取得に失敗しました"}</p>
        <Button onClick={() => router.push("/")}>トップに戻る</Button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalAnswered = (setNumber - 1) * QUESTIONS_PER_SET + answeredCount;

  return (
    <div className="flex flex-col">
      {/* 進捗 */}
      <div className="mb-6">
        <ProgressBar
          current={totalAnswered}
          total={TOTAL_SETS * QUESTIONS_PER_SET}
          label="全体の進捗"
        />
      </div>

      {/* カテゴリ名 */}
      <div className="bg-warm-100 rounded-xl px-4 py-3 mb-6">
        <div className="text-xs text-text-muted mb-0.5">
          カテゴリ {setNumber} / {TOTAL_SETS}
        </div>
        <div className="font-bold text-warm-800">{data.categoryLabel}</div>
      </div>

      {/* 質問一覧 */}
      <div className="space-y-6 mb-8">
        {data.questions.map((q, idx) => (
          <div
            key={q.questionId}
            className="bg-surface rounded-xl p-4 border border-border"
          >
            <div className="flex items-start gap-2 mb-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-warm-200 text-warm-700 text-sm font-medium flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="text-sm text-text leading-relaxed pt-0.5">
                {q.questionText}
              </p>
            </div>
            <AnswerScale
              value={answers[q.questionId] || null}
              onChange={(value) => handleAnswer(q.questionId, value)}
            />
          </div>
        ))}
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* 送信ボタン */}
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || answeredCount < QUESTIONS_PER_SET}
      >
        {submitting
          ? "送信中..."
          : setNumber < TOTAL_SETS
          ? `次のカテゴリへ（${answeredCount}/${QUESTIONS_PER_SET}問回答済み）`
          : `診断結果を生成する（${answeredCount}/${QUESTIONS_PER_SET}問回答済み）`}
      </Button>

      {/* 前のカテゴリに戻るボタン */}
      {setNumber > 1 && (
        <button
          onClick={() => router.push(`/diagnosis/${setNumber - 1}`)}
          className="mt-3 text-sm text-text-light hover:text-text underline"
        >
          前のカテゴリに戻る
        </button>
      )}
    </div>
  );
}
