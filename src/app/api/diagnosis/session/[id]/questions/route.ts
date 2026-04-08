import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, ANSWER_SCALE, QUESTIONS_PER_SET, TOTAL_SETS } from "@/config/categories";
import { getQuestionVariant, shuffleQuestionsForSession } from "@/config/question-variants";

// GET /api/diagnosis/session/[id]/questions?set=1 - 質問取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const setNumber = parseInt(url.searchParams.get("set") || "1", 10);

    if (setNumber < 1 || setNumber > TOTAL_SETS) {
      return NextResponse.json(
        { success: false, error: `setは1〜${TOTAL_SETS}の範囲で指定してください` },
        { status: 400 }
      );
    }

    // セッション存在チェック
    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
    });
    if (!session) {
      return NextResponse.json(
        { success: false, error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    const category = CATEGORIES[setNumber - 1];

    // DBから質問を取得
    const questions = await prisma.diagnosisQuestion.findMany({
      where: {
        categoryId: category.id,
        activeFlag: true,
      },
      orderBy: { displayOrder: "asc" },
      take: QUESTIONS_PER_SET,
    });

    // セッションIDでカテゴリ内の質問順序をシャッフル
    const shuffled = shuffleQuestionsForSession(questions, id, category.id);

    // 既存の回答を取得（再開時に使用）
    const existingAnswers = await prisma.diagnosisAnswer.findMany({
      where: {
        sessionId: id,
        questionId: { in: questions.map((q) => q.id) },
      },
    });

    const answerMap = Object.fromEntries(
      existingAnswers.map((a) => [a.questionId, a.answer])
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        setNumber,
        categoryId: category.id,
        categoryLabel: category.label,
        questions: shuffled.map((q, i) => ({
          questionId: q.id,
          displayOrder: i + 1,
          questionText: getQuestionVariant(q.id, id) || q.questionText,
          existingAnswer: answerMap[q.id] || null,
        })),
        answerScale: ANSWER_SCALE,
      },
    });
  } catch (error) {
    console.error("Questions fetch error:", error);
    return NextResponse.json(
      { success: false, error: "質問の取得に失敗しました" },
      { status: 500 }
    );
  }
}
