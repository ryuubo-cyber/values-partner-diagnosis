import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/diagnosis/session - セッション作成
export async function POST() {
  try {
    const session = await prisma.diagnosisSession.create({
      data: {},
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { success: false, error: "セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
