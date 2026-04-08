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

    // カテゴリ別の差分を計算（より厳格な基準）
    const categoryDiffs = Object.keys(scoresA).map((catId) => {
      const scoreA = scoresA[catId] ?? 0;
      const scoreB = scoresB[catId] ?? 0;
      const diff = Math.abs(scoreA - scoreB);
      // 厳格基準: 差5以下=high, 差10以下=mid, それ以外=low
      return {
        categoryId: catId,
        label: CATEGORY_MAP[catId]?.label || catId,
        scoreA,
        scoreB,
        diff,
        match: diff <= 5 ? "high" : diff <= 10 ? "mid" : "low",
      };
    });

    // 総合相性スコア（厳格化: 70以上なら高い相性）
    const totalDiff = categoryDiffs.reduce((sum, c) => sum + c.diff, 0);
    const maxDiff = categoryDiffs.length * 40;
    const rawScore = (1 - totalDiff / maxDiff) * 100;
    // 厳格化: スコアを0-100に分布させるが、甘くならないよう補正
    const compatibilityScore = Math.round(Math.max(0, Math.min(100, rawScore * 0.9 + 5)));

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

    // 関係タイプ別相性（厳格化 + 結婚追加）
    const romanceScore = calcRelationScore(categoryDiffs, ["money", "communication", "family", "selfcare", "lifestyle"]);
    const marriageScore = calcRelationScore(categoryDiffs, ["money", "family", "communication", "lifestyle", "career"]);
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
          marriage: marriageScore,
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
  // 厳格化: 差が大きいほどスコアが急激に下がるよう補正
  const rawScore = (1 - avgDiff / 40) * 100;
  return Math.round(Math.max(0, Math.min(100, rawScore * 0.85 + 10)));
}
