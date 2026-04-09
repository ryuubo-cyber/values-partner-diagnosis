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
        profile: true,
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

    // プロフィール情報を整形（空文字でないフィールドのみ返す）
    const profile: Record<string, string> = {};
    if (session.profile) {
      const p = session.profile;
      if (p.birthDate) profile.birthDate = p.birthDate;
      if (p.gender) profile.gender = p.gender;
      if (p.ageRange) profile.ageRange = p.ageRange;
      if (p.birthPlace) profile.birthPlace = p.birthPlace;
      if (p.currentResidence) profile.currentResidence = p.currentResidence;
      if (p.occupation) profile.occupation = p.occupation;
      if (p.familyStructure) profile.familyStructure = p.familyStructure;
      if (p.lifestyle) profile.lifestyle = p.lifestyle;
      if (p.snsUsage) profile.snsUsage = p.snsUsage;
      if (p.foodPreference) profile.foodPreference = p.foodPreference;
      if (p.financialHabit) profile.financialHabit = p.financialHabit;
      if (p.friendCount) profile.friendCount = p.friendCount;
      if (p.parentRelationship) profile.parentRelationship = p.parentRelationship;
      if (p.hobbies) profile.hobbies = p.hobbies;
      if (p.transportation) profile.transportation = p.transportation;
      if (p.personalityType) profile.personalityType = p.personalityType;
      if (p.clubActivity) profile.clubActivity = p.clubActivity;
      if (p.beautyInterest) profile.beautyInterest = p.beautyInterest;
      if (p.itLiteracy) profile.itLiteracy = p.itLiteracy;
      if (p.moneyLiteracy) profile.moneyLiteracy = p.moneyLiteracy;
      if (p.meetingHistory) profile.meetingHistory = p.meetingHistory;
      if (p.partnerMeetingWay) profile.partnerMeetingWay = p.partnerMeetingWay;
      if (p.futurePlan) profile.futurePlan = p.futurePlan;
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        scores,
        report: reportJson,
        profile,
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
