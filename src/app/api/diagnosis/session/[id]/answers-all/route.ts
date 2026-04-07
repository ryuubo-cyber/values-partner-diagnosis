import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_MAP } from "@/config/categories";

// GET /api/diagnosis/session/[id]/answers-all - 全回答取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
      include: { answers: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // 全質問をDB取得
    const questions = await prisma.diagnosisQuestion.findMany({
      where: { activeFlag: true },
      orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    });

    const answerMap = Object.fromEntries(
      session.answers.map((a) => [a.questionId, a.answer])
    );

    const result = questions.map((q) => ({
      questionId: q.id,
      categoryId: q.categoryId,
      categoryLabel: CATEGORY_MAP[q.categoryId]?.label || q.categoryId,
      displayOrder: q.displayOrder,
      questionText: q.questionText,
      answer: answerMap[q.id] ?? null,
      reverseScore: q.reverseScore,
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        totalAnswered: session.answers.length,
        answers: result,
      },
    });
  } catch (error) {
    console.error("Answers fetch error:", error);
    return NextResponse.json(
      { success: false, error: "回答の取得に失敗しました" },
      { status: 500 }
    );
  }
}
