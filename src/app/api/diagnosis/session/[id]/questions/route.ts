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

    // セッション＋プロフィール取得
    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
      include: { profile: true },
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

    // 既婚・子供ありユーザーに不要な質問を自動回答に設定
    const autoAnswerMap = buildAutoAnswerMap(session.profile?.familyStructure || "");

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
          autoAnswer: autoAnswerMap[q.id] || null,
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

/**
 * 既婚・子供ありのユーザーに対して、文脈的に不適切な質問を自動回答に設定
 * - 既婚者: 「将来は家庭を持ちたい」「結婚は人生の大きな目標」をスキップ
 * - 子供あり: 「子どもを持つことについて考えた」をスキップ
 */
function buildAutoAnswerMap(familyStructure: string): Record<string, number> {
  const map: Record<string, number> = {};
  if (!familyStructure) return map;

  const isMarried = familyStructure.includes("既婚");
  const hasChildren =
    familyStructure.includes("子供あり") ||
    familyStructure.includes("シングルマザー") ||
    familyStructure.includes("シングルファーザー") ||
    familyStructure.includes("子供と暮らし");

  if (isMarried) {
    // q021: 将来は家庭を持ちたいと思っている → すでに家庭がある
    map["q021"] = 5;
    // q028: 結婚は人生の大きな目標のひとつだ → すでに結婚している
    map["q028"] = 4;
  }

  if (hasChildren) {
    // q026: 子どもを持つことについて具体的に考えたことがある → すでに子供がいる
    map["q026"] = 5;
  }

  return map;
}
