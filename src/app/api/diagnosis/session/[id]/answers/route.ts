import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, QUESTIONS_PER_SET, TOTAL_QUESTIONS } from "@/config/categories";

interface AnswerInput {
  questionId: string;
  answer: number;
}

// POST /api/diagnosis/session/[id]/answers - 回答送信（10問分）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { setNumber, answers } = body as {
      setNumber: number;
      answers: AnswerInput[];
    };

    // バリデーション
    if (!answers || !Array.isArray(answers) || answers.length !== QUESTIONS_PER_SET) {
      return NextResponse.json(
        { success: false, error: `回答は${QUESTIONS_PER_SET}問分必要です` },
        { status: 400 }
      );
    }

    // 回答値のバリデーション
    for (const ans of answers) {
      if (!ans.questionId || typeof ans.answer !== "number" || ans.answer < 1 || ans.answer > 5) {
        return NextResponse.json(
          { success: false, error: "回答値は1〜5の整数で指定してください" },
          { status: 400 }
        );
      }
    }

    // 重複チェック
    const questionIds = answers.map((a) => a.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      return NextResponse.json(
        { success: false, error: "同じquestionIdの重複があります" },
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

    if (session.status === "completed" || session.status === "result_generated") {
      return NextResponse.json(
        { success: false, error: "既に完了したセッションです" },
        { status: 400 }
      );
    }

    const categoryId = CATEGORIES[setNumber - 1]?.id;
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "無効なセット番号です" },
        { status: 400 }
      );
    }

    // 回答をupsert（再送信にも対応）
    const now = new Date();
    for (const ans of answers) {
      await prisma.diagnosisAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: id,
            questionId: ans.questionId,
          },
        },
        update: {
          answer: ans.answer,
          answeredAt: now,
        },
        create: {
          sessionId: id,
          questionId: ans.questionId,
          categoryId,
          answer: ans.answer,
          answeredAt: now,
        },
      });
    }

    // 全回答数を数える
    const totalAnswered = await prisma.diagnosisAnswer.count({
      where: { sessionId: id },
    });

    const isCompleted = totalAnswered >= TOTAL_QUESTIONS;
    const nextSetNumber = isCompleted ? null : setNumber + 1;

    // セッション更新
    await prisma.diagnosisSession.update({
      where: { id },
      data: {
        status: isCompleted ? "completed" : "in_progress",
        currentCategoryIndex: isCompleted ? CATEGORIES.length - 1 : setNumber,
        completedQuestionCount: totalAnswered,
        startedAt: session.startedAt || now,
        lastAnsweredAt: now,
        completedAt: isCompleted ? now : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        completedQuestionCount: totalAnswered,
        nextSetNumber,
        status: isCompleted ? "completed" : "in_progress",
      },
    });
  } catch (error) {
    console.error("Answer save error:", error);
    return NextResponse.json(
      { success: false, error: "回答の保存に失敗しました" },
      { status: 500 }
    );
  }
}
