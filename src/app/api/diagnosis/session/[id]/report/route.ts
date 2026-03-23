import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/diagnosis/session/[id]/report - 診断結果取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
      include: {
        report: true,
        score: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    if (!session.report) {
      return NextResponse.json(
        { success: false, error: "診断結果がまだ生成されていません" },
        { status: 404 }
      );
    }

    const reportJson = JSON.parse(session.report.reportJson);
    const scores = session.score
      ? {
          categoryScores: JSON.parse(session.score.categoryScores),
          weightedScores: JSON.parse(session.score.weightedScores),
          mainType: session.score.mainType,
          subType: session.score.subType,
          highCategories: JSON.parse(session.score.highCategories),
          lowCategories: JSON.parse(session.score.lowCategories),
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        scores,
        report: reportJson,
        modelName: session.report.modelName,
        generatedAt: session.report.generatedAt,
      },
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { success: false, error: "診断結果の取得に失敗しました" },
      { status: 500 }
    );
  }
}
