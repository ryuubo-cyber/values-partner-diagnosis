import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_MAP } from "@/config/categories";

// GET /api/diagnosis/compare?a=sessionId1&b=sessionId2
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idA = searchParams.get("a");
    const idB = searchParams.get("b");

    if (!idA || !idB) {
      return NextResponse.json(
        { success: false, error: "セッションIDが不足しています" },
        { status: 400 }
      );
    }

    // セッション・スコア・プロフィール・全回答を一括取得
    const [sessionA, sessionB] = await Promise.all([
      prisma.diagnosisSession.findUnique({
        where: { id: idA },
        include: { score: true, report: true, profile: true, answers: true },
      }),
      prisma.diagnosisSession.findUnique({
        where: { id: idB },
        include: { score: true, report: true, profile: true, answers: true },
      }),
    ]);

    if (!sessionA?.score || !sessionB?.score) {
      return NextResponse.json(
        { success: false, error: "どちらかの診断結果が見つかりません" },
        { status: 404 }
      );
    }

    const scoresA = JSON.parse(sessionA.score.categoryScores) as Record<string, number>;
    const scoresB = JSON.parse(sessionB.score.categoryScores) as Record<string, number>;

    // カテゴリ別の差分を計算（より厳格な基準）
    const categoryDiffs = Object.keys(scoresA).map((catId) => {
      const scoreA = scoresA[catId] ?? 0;
      const scoreB = scoresB[catId] ?? 0;
      const diff = Math.abs(scoreA - scoreB);
      return {
        categoryId: catId,
        label: CATEGORY_MAP[catId]?.label || catId,
        scoreA,
        scoreB,
        diff,
        match: diff <= 5 ? ("high" as const) : diff <= 10 ? ("mid" as const) : ("low" as const),
      };
    });

    // 総合相性スコア（厳格化: 0.8x で 70以上は本当に近い人だけ）
    const totalDiff = categoryDiffs.reduce((sum, c) => sum + c.diff, 0);
    const maxDiff = categoryDiffs.length * 40;
    const rawScore = (1 - totalDiff / maxDiff) * 100;
    const compatibilityScore = Math.round(Math.max(0, Math.min(100, rawScore * 0.8)));

    // 特に相性が良いカテゴリ（差が5以下）
    const strongMatches = categoryDiffs
      .filter((c) => c.match === "high")
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);

    // 要注意カテゴリ（差が10超）
    const gapCategories = categoryDiffs
      .filter((c) => c.match === "low")
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);

    // 関係タイプ別相性（厳格化: 0.75x+5）
    const romanceScore = calcRelationScore(categoryDiffs, ["money", "communication", "family", "selfcare", "leisure"]);
    const marriageScore = calcRelationScore(categoryDiffs, ["money", "family", "communication", "food", "career"]);
    const businessScore = calcRelationScore(categoryDiffs, ["career", "growth", "money", "curiosity"]);
    const friendshipScore = calcRelationScore(categoryDiffs, ["leisure", "society", "curiosity", "communication"]);
    const clientScore = calcRelationScore(categoryDiffs, ["career", "money", "communication", "growth"]);

    // ===== 質問レベルの差分分析 =====
    // 質問テキストも取得
    const questions = await prisma.diagnosisQuestion.findMany({
      where: { activeFlag: true },
      orderBy: { displayOrder: "asc" },
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // 回答をマップ化
    const answersMapA = new Map(sessionA.answers.map((a) => [a.questionId, a.answer]));
    const answersMapB = new Map(sessionB.answers.map((a) => [a.questionId, a.answer]));

    // 各質問の差分を計算
    const questionDiffs = questions
      .map((q) => {
        const ansA = answersMapA.get(q.id) ?? 0;
        const ansB = answersMapB.get(q.id) ?? 0;
        // reverseScore の場合は逆転させた値で比較（実質的な価値観の方向性）
        const effectiveA = q.reverseScore ? 6 - ansA : ansA;
        const effectiveB = q.reverseScore ? 6 - ansB : ansB;
        const diff = Math.abs(effectiveA - effectiveB);
        return {
          questionId: q.id,
          categoryId: q.categoryId,
          categoryLabel: CATEGORY_MAP[q.categoryId]?.label || q.categoryId,
          questionText: q.questionText,
          answerA: ansA,
          answerB: ansB,
          effectiveDiff: diff,
        };
      })
      .sort((a, b) => b.effectiveDiff - a.effectiveDiff);

    // 大きなズレ（差3以上 = 価値観が真逆に近い）
    const bigGapQuestions = questionDiffs
      .filter((q) => q.effectiveDiff >= 3)
      .slice(0, 10);

    // 完全一致または非常に近い質問（差0-1）
    const closeQuestions = questionDiffs
      .filter((q) => q.effectiveDiff <= 1)
      .slice(0, 5);

    // カテゴリ別の質問ズレ集計
    const categoryQuestionGaps: Record<string, { total: number; bigGaps: number }> = {};
    for (const qd of questionDiffs) {
      if (!categoryQuestionGaps[qd.categoryId]) {
        categoryQuestionGaps[qd.categoryId] = { total: 0, bigGaps: 0 };
      }
      categoryQuestionGaps[qd.categoryId].total += qd.effectiveDiff;
      if (qd.effectiveDiff >= 3) {
        categoryQuestionGaps[qd.categoryId].bigGaps += 1;
      }
    }

    // ===== プロフィール情報 =====
    const profileA = extractProfile(sessionA.profile);
    const profileB = extractProfile(sessionB.profile);

    return NextResponse.json({
      success: true,
      data: {
        personA: {
          sessionId: idA,
          shareCode: idA.slice(-6).toUpperCase(),
          mainType: sessionA.score.mainType,
          subType: sessionA.score.subType,
          profile: profileA,
        },
        personB: {
          sessionId: idB,
          shareCode: idB.slice(-6).toUpperCase(),
          mainType: sessionB.score.mainType,
          subType: sessionB.score.subType,
          profile: profileB,
        },
        compatibilityScore,
        categoryDiffs,
        strongMatches,
        gapCategories,
        relationScores: {
          romance: romanceScore,
          marriage: marriageScore,
          business: businessScore,
          friendship: friendshipScore,
          client: clientScore,
        },
        questionAnalysis: {
          bigGapQuestions,
          closeQuestions,
          categoryQuestionGaps,
        },
      },
    });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json(
      { success: false, error: "比較処理に失敗しました" },
      { status: 500 }
    );
  }
}

function calcRelationScore(
  diffs: Array<{ categoryId: string; diff: number }>,
  targetCategories: string[]
): number {
  const relevant = diffs.filter((d) => targetCategories.includes(d.categoryId));
  if (relevant.length === 0) return 50;
  const avgDiff = relevant.reduce((sum, d) => sum + d.diff, 0) / relevant.length;
  // 厳格化: 0.75x + 5 で70以上が出にくくする
  const rawScore = (1 - avgDiff / 40) * 100;
  return Math.round(Math.max(0, Math.min(100, rawScore * 0.75 + 5)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProfile(profile: any): Record<string, string> {
  if (!profile) return {};
  const result: Record<string, string> = {};
  const fields = [
    "birthDate", "gender", "ageRange", "birthPlace", "currentResidence",
    "favoriteMusic", "occupation", "familyStructure", "lifestyle",
    "smartphone", "snsUsage", "foodPreference", "financialHabit",
    "friendCount", "parentRelationship", "hobbies", "transportation",
    "personalityType", "clubActivity", "beautyInterest", "itLiteracy", "moneyLiteracy",
    "meetingHistory", "partnerMeetingWay", "futurePlan",
  ];
  for (const f of fields) {
    if (profile[f]) result[f] = profile[f];
  }
  return result;
}
