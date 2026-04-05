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

    const [sessionA, sessionB] = await Promise.all([
      prisma.diagnosisSession.findUnique({
        where: { id: idA },
        include: { score: true, report: true },
      }),
      prisma.diagnosisSession.findUnique({
        where: { id: idB },
        include: { score: true, report: true },
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

    // カテゴリ別の差分を計算
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
        match: diff <= 8 ? "high" : diff <= 15 ? "mid" : "low",
      };
    });

    // 相性スコア計算（差が小さいほど高い）
    const totalDiff = categoryDiffs.reduce((sum, c) => sum + c.diff, 0);
    const maxDiff = categoryDiffs.length * 40; // 全カテゴリ最大差
    const compatibilityScore = Math.round((1 - totalDiff / maxDiff) * 100);

    // 特に相性が良いカテゴリ（差が8以下）
    const strongMatches = categoryDiffs
      .filter((c) => c.match === "high")
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);

    // 要注意カテゴリ（差が15超）
    const gapCategories = categoryDiffs
      .filter((c) => c.match === "low")
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 2);

    // 関係タイプ別相性コメント
    const romanceScore = calcRelationScore(categoryDiffs, ["money", "communication", "family", "selfcare"]);
    const businessScore = calcRelationScore(categoryDiffs, ["career", "growth", "money", "curiosity"]);
    const friendshipScore = calcRelationScore(categoryDiffs, ["leisure", "society", "curiosity", "communication"]);
    const clientScore = calcRelationScore(categoryDiffs, ["career", "money", "communication", "growth"]);

    return NextResponse.json({
      success: true,
      data: {
        personA: {
          sessionId: idA,
          shareCode: idA.slice(-6).toUpperCase(),
          mainType: sessionA.score.mainType,
          subType: sessionA.score.subType,
        },
        personB: {
          sessionId: idB,
          shareCode: idB.slice(-6).toUpperCase(),
          mainType: sessionB.score.mainType,
          subType: sessionB.score.subType,
        },
        compatibilityScore,
        categoryDiffs,
        strongMatches,
        gapCategories,
        relationScores: {
          romance: romanceScore,
          business: businessScore,
          friendship: friendshipScore,
          client: clientScore,
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
  return Math.round((1 - avgDiff / 40) * 100);
}
