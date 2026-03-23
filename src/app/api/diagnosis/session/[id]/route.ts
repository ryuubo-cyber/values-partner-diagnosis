import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUESTIONS_PER_SET } from "@/config/categories";

// GET /api/diagnosis/session/[id] - セッション状態取得（再開用）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    const nextSetNumber =
      Math.floor(session.completedQuestionCount / QUESTIONS_PER_SET) + 1;

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        currentCategoryIndex: session.currentCategoryIndex,
        completedQuestionCount: session.completedQuestionCount,
        nextSetNumber,
        startedAt: session.startedAt,
        lastAnsweredAt: session.lastAnsweredAt,
        completedAt: session.completedAt,
      },
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { success: false, error: "セッション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
