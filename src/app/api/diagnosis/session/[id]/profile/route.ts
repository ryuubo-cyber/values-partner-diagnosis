import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_FIELD_LENGTH = 500;

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

// POST /api/diagnosis/session/[id]/profile - プロフィール保存
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    // プロフィール保存（upsert）
    const profileData = {
      birthDate: sanitize(body.birthDate),
      gender: sanitize(body.gender),
      ageRange: sanitize(body.ageRange),
      birthPlace: sanitize(body.birthPlace),
      currentResidence: sanitize(body.currentResidence),
      favoriteMusic: sanitize(body.favoriteMusic),
      politicalInterest: sanitize(body.politicalInterest),
      occupation: sanitize(body.occupation),
      familyStructure: sanitize(body.familyStructure),
      lifestyle: sanitize(body.lifestyle),
      smartphone: sanitize(body.smartphone),
      snsUsage: sanitize(body.snsUsage),
      foodPreference: sanitize(body.foodPreference),
      financialHabit: sanitize(body.financialHabit),
      friendCount: sanitize(body.friendCount),
      parentRelationship: sanitize(body.parentRelationship),
      hobbies: sanitize(body.hobbies),
      transportation: sanitize(body.transportation),
      personalityType: sanitize(body.personalityType),
      clubActivity: sanitize(body.clubActivity),
      beautyInterest: sanitize(body.beautyInterest),
      itLiteracy: sanitize(body.itLiteracy),
      moneyLiteracy: sanitize(body.moneyLiteracy),
    };
    await prisma.diagnosisProfile.upsert({
      where: { sessionId: id },
      update: profileData,
      create: { sessionId: id, ...profileData },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile save error:", error);
    return NextResponse.json(
      { success: false, error: "プロフィールの保存に失敗しました" },
      { status: 500 }
    );
  }
}
