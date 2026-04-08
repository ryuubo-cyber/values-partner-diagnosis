import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOTAL_QUESTIONS } from "@/config/categories";
import {
  calculateCategoryScores,
  calculateWeightedScores,
  getHighCategories,
  getLowCategories,
} from "@/lib/scoring";
import { judgeMainType, judgeSubType } from "@/lib/type-judge";
import { generateAIReport } from "@/lib/ai-report";

// Vercelサーバーレス関数のタイムアウトを60秒に延長
export const maxDuration = 60;

// POST /api/diagnosis/session/[id]/generate-report - 診断結果生成
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const forceRegenerate = body?.forceRegenerate === true;

    // セッション取得
    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
      include: { profile: true, report: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // 既にレポートがあり、再生成でない場合
    if (session.report && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        data: {
          status: "result_generated",
          reportId: session.report.id,
        },
      });
    }

    // 回答数チェック
    const answerCount = await prisma.diagnosisAnswer.count({
      where: { sessionId: id },
    });

    if (answerCount < TOTAL_QUESTIONS) {
      return NextResponse.json(
        {
          success: false,
          error: `回答が不足しています（${answerCount}/${TOTAL_QUESTIONS}問完了）`,
        },
        { status: 400 }
      );
    }

    // 全回答取得
    const answers = await prisma.diagnosisAnswer.findMany({
      where: { sessionId: id },
    });

    // スコア計算
    const categoryScores = calculateCategoryScores(answers);
    const weightedScores = calculateWeightedScores(categoryScores);
    const highCategories = getHighCategories(categoryScores);
    const lowCategories = getLowCategories(categoryScores);
    const mainType = judgeMainType(highCategories);
    const subType = judgeSubType(highCategories);

    // スコア保存
    await prisma.diagnosisScore.upsert({
      where: { sessionId: id },
      update: {
        categoryScores: JSON.stringify(categoryScores),
        weightedScores: JSON.stringify(weightedScores),
        mainType,
        subType,
        highCategories: JSON.stringify(highCategories),
        lowCategories: JSON.stringify(lowCategories),
      },
      create: {
        sessionId: id,
        categoryScores: JSON.stringify(categoryScores),
        weightedScores: JSON.stringify(weightedScores),
        mainType,
        subType,
        highCategories: JSON.stringify(highCategories),
        lowCategories: JSON.stringify(lowCategories),
      },
    });

    // プロフィール情報を整形
    const profile: Record<string, string> = {};
    if (session.profile) {
      const p = session.profile;
      if (p.birthDate) profile.birthDate = p.birthDate;
      if (p.gender) profile.gender = p.gender;
      if (p.ageRange) profile.ageRange = p.ageRange;
      if (p.birthPlace) profile.birthPlace = p.birthPlace;
      if (p.currentResidence) profile.currentResidence = p.currentResidence;
      if (p.favoriteMusic) profile.favoriteMusic = p.favoriteMusic;
      if (p.politicalInterest) profile.politicalInterest = p.politicalInterest;
      if (p.occupation) profile.occupation = p.occupation;
      if (p.familyStructure) profile.familyStructure = p.familyStructure;
      if (p.lifestyle) profile.lifestyle = p.lifestyle;
      if (p.smartphone) profile.smartphone = p.smartphone;
      if (p.snsUsage) profile.snsUsage = p.snsUsage;
      if (p.foodPreference) profile.foodPreference = p.foodPreference;
      if (p.financialHabit) profile.financialHabit = p.financialHabit;
      if (p.friendCount) profile.friendCount = p.friendCount;
      if (p.parentRelationship) profile.parentRelationship = p.parentRelationship;
    }

    // AIレポート生成（再生成時はHaikuモデルで高速化）
    const { reportJson, modelName, isFallback } = await generateAIReport(
      {
        profile,
        scores: categoryScores,
        highCategories,
        lowCategories,
        mainType,
        subType,
      },
      forceRegenerate
    );

    // レポート保存
    const now = new Date();
    if (session.report) {
      await prisma.diagnosisReport.update({
        where: { id: session.report.id },
        data: {
          reportJson: JSON.stringify(reportJson),
          reportText: reportJson.overallType?.text || "",
          modelName,
          generatedAt: now,
        },
      });
    } else {
      await prisma.diagnosisReport.create({
        data: {
          sessionId: id,
          reportJson: JSON.stringify(reportJson),
          reportText: reportJson.overallType?.text || "",
          modelName,
          generatedAt: now,
        },
      });
    }

    // セッション更新
    await prisma.diagnosisSession.update({
      where: { id },
      data: {
        status: "result_generated",
        resultGeneratedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        status: "result_generated",
        isFallback,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { success: false, error: "診断結果の生成に失敗しました" },
      { status: 500 }
    );
  }
}
