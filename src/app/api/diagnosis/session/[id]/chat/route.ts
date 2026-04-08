import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CATEGORY_MAP } from "@/config/categories";

// Vercelサーバーレス関数のタイムアウトを60秒に延長
export const maxDuration = 60;

// 1セッションあたりのチャット上限回数
const MAX_CHAT_PER_SESSION = 10;
// レート制限: 同一IPから1分間に許可するリクエスト数
const RATE_LIMIT_PER_MINUTE = 5;

// メモリ内レート制限（Vercelのサーバーレスでは関数インスタンスごと）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_MINUTE) return false;
  entry.count++;
  return true;
}

const DEEP_DIVE_SYSTEM_PROMPT = `あなたは「価値観診断カウンセラー」です。
ユーザーは100問の価値観診断を受け、詳細な診断結果を持っています。
あなたの役割は、診断結果をもとに、ユーザーが気になる部分を深掘りし、より具体的で実践的なアドバイスを提供することです。

■ 基本姿勢
- 共感的で温かいカウンセラー調
- ユーザーの具体的なスコアやプロフィールに基づいて回答する
- 一般論ではなく、このユーザーだからこそ当てはまる内容を語る
- 必要に応じてユーザーに追加の質問をして、より深い分析を行う

■ できること
- 診断結果の各セクションの深掘り解説
- 特定のカテゴリについてのより詳しい分析
- 具体的な行動提案やアドバイス
- パートナー相性の詳しい解説
- 四柱推命の追加鑑定
- 出会いのヒントの具体化
- お金観・結婚観の深掘り
- ユーザーの質問に応じた追加の質問で理解を深める

■ 対話スタイル
- ユーザーの質問に直接答えつつ、関連する深掘り質問を1-2個提案する
- 「もう少し教えてください」「こんな場合はどうですか？」のように対話を促す
- 短すぎず長すぎず、読みやすい長さで回答する（200-500字程度）
- 箇条書きと文章を組み合わせて読みやすく

■ 禁止事項
- 診断結果を否定する
- 不安を煽る表現
- 詐欺リスクの高い出会いの場の推奨
- 医学的・法的アドバイス`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { messages, sectionContext } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      sectionContext?: string;
    };

    if (!messages || messages.length === 0) {
      return Response.json(
        { success: false, error: "メッセージが必要です" },
        { status: 400 }
      );
    }

    // IPベースのレート制限
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return Response.json(
        { success: false, error: "リクエストが多すぎます。1分ほどお待ちください。" },
        { status: 429 }
      );
    }

    // ユーザーメッセージ数をカウント（会話上限チェック）
    const userMessageCount = messages.filter((m: { role: string }) => m.role === "user").length;
    if (userMessageCount > MAX_CHAT_PER_SESSION) {
      return Response.json(
        { success: false, error: `深掘りチャットは1セッションあたり${MAX_CHAT_PER_SESSION}回までご利用いただけます。新しく診断を受けると、また利用できます。` },
        { status: 429 }
      );
    }

    // セッションと診断データを取得
    const session = await prisma.diagnosisSession.findUnique({
      where: { id },
      include: { profile: true, score: true, report: true },
    });

    if (!session || !session.report || !session.score) {
      return Response.json(
        { success: false, error: "診断結果が見つかりません" },
        { status: 404 }
      );
    }

    const reportJson = JSON.parse(session.report.reportJson);
    const scores = {
      categoryScores: JSON.parse(session.score.categoryScores),
      mainType: session.score.mainType,
      subType: session.score.subType,
      highCategories: JSON.parse(session.score.highCategories),
      lowCategories: JSON.parse(session.score.lowCategories),
    };

    // プロフィール整形
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
    }

    // スコアラベル付き
    const scoreLabels: Record<string, string> = {};
    for (const [catId, score] of Object.entries(scores.categoryScores as Record<string, number>)) {
      const label = CATEGORY_MAP[catId]?.label || catId;
      scoreLabels[label] = `${score}点`;
    }

    // コンテキストメッセージを構築
    let contextMessage = `【このユーザーの診断データ】

プロフィール: ${JSON.stringify(profile, null, 2)}

カテゴリスコア: ${JSON.stringify(scoreLabels, null, 2)}

メインタイプ: ${scores.mainType}
サブタイプ: ${scores.subType}
高得点カテゴリ: ${(scores.highCategories as string[]).map((cid: string) => CATEGORY_MAP[cid]?.label || cid).join("、")}
低得点カテゴリ: ${(scores.lowCategories as string[]).map((cid: string) => CATEGORY_MAP[cid]?.label || cid).join("、")}

【診断結果の要約】
全体タイプ: ${reportJson.overallType?.title}
${reportJson.overallType?.text ? `全体分析: ${reportJson.overallType.text.slice(0, 300)}...` : ""}
理想のパートナー像: ${reportJson.idealPartnerAnalysis?.title}
出会いのヒント: ${reportJson.encounterHints?.title}
お金観分析: ${reportJson.moneyAnalysis?.title}
恋愛・結婚分析: ${reportJson.loveAndMarriageAnalysis?.title}`;

    if (sectionContext) {
      contextMessage += `\n\n【ユーザーが特に深掘りしたいセクションの内容】\n${sectionContext}`;
    }

    // APIキーチェック
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { success: false, error: "AI機能が利用できません。ANTHROPIC_API_KEYが設定されていません。" },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });
    const modelName = process.env.AI_MODEL_NAME || "claude-sonnet-4-20250514";

    // 非ストリーミングで呼び出し（Vercelサーバーレス互換）
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 2048,
      system: DEEP_DIVE_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: contextMessage },
        { role: "assistant", content: "診断データを確認しました。ユーザーの質問にお答えします。" },
        ...messages,
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return Response.json({
      success: true,
      data: { text },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Anthropic APIのエラーを分かりやすく変換
    let userMessage = "チャットエラーが発生しました";
    let status = 500;

    if (error instanceof Anthropic.AuthenticationError) {
      userMessage = "AI機能の認証に失敗しました。管理者にお問い合わせください。";
      status = 503;
    } else if (error instanceof Anthropic.RateLimitError) {
      userMessage = "AIへのリクエストが混み合っています。少し時間を置いてお試しください。";
      status = 429;
    } else if (error instanceof Anthropic.APIError) {
      userMessage = "AI機能が一時的に利用できません。しばらくお待ちください。";
      status = 503;
    }

    return Response.json(
      { success: false, error: userMessage },
      { status }
    );
  }
}
