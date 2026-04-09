import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_MAP } from "@/config/categories";
import Anthropic from "@anthropic-ai/sdk";
import {
  COMPARE_SYSTEM_PROMPT,
  buildComparePrompt,
  CompareAIInput,
} from "@/config/prompts";

export const maxDuration = 60;

interface CompareReportSection {
  title: string;
  text: string;
}

interface CompareReportJson {
  overallAnalysis: CompareReportSection;
  strengthsAsCouple: CompareReportSection;
  challengeAreas: CompareReportSection;
  questionLevelInsight: CompareReportSection;
  romanceAdvice: CompareReportSection;
  marriageAdvice: CompareReportSection;
  communicationTips: CompareReportSection;
  profileCompatibility: CompareReportSection;
  counselorMessage: CompareReportSection;
}

// POST /api/diagnosis/compare/ai-report
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idA, idB } = body;

    if (!idA || !idB) {
      return NextResponse.json(
        { success: false, error: "セッションIDが不足しています" },
        { status: 400 }
      );
    }

    // 両者のデータを一括取得
    const [sessionA, sessionB] = await Promise.all([
      prisma.diagnosisSession.findUnique({
        where: { id: idA },
        include: { score: true, profile: true, answers: true },
      }),
      prisma.diagnosisSession.findUnique({
        where: { id: idB },
        include: { score: true, profile: true, answers: true },
      }),
    ]);

    if (!sessionA?.score || !sessionB?.score) {
      return NextResponse.json(
        { success: false, error: "どちらかの診断結果が見つかりません" },
        { status: 404 }
      );
    }

    const scoresA = JSON.parse(sessionA.score.categoryScores) as Record<string, number>;
    const scoresB = JSON.parse(sessionB.score.categoryScores) as Record<string, number>;

    // カテゴリ差分
    const categoryDiffs = Object.keys(scoresA).map((catId) => {
      const scoreA = scoresA[catId] ?? 0;
      const scoreB = scoresB[catId] ?? 0;
      const diff = Math.abs(scoreA - scoreB);
      return { categoryId: catId, diff };
    });

    // 総合スコア
    const totalDiff = categoryDiffs.reduce((sum, c) => sum + c.diff, 0);
    const maxDiffTotal = categoryDiffs.length * 40;
    const rawScore = (1 - totalDiff / maxDiffTotal) * 100;
    const compatibilityScore = Math.round(Math.max(0, Math.min(100, rawScore * 0.8)));

    // 関係タイプ別スコア
    const calcRel = (cats: string[]) => {
      const relevant = categoryDiffs.filter((d) => cats.includes(d.categoryId));
      if (relevant.length === 0) return 50;
      const avg = relevant.reduce((s, d) => s + d.diff, 0) / relevant.length;
      return Math.round(Math.max(0, Math.min(100, (1 - avg / 40) * 100 * 0.75 + 5)));
    };
    const relationScores = {
      romance: calcRel(["money", "communication", "family", "selfcare", "leisure"]),
      marriage: calcRel(["money", "family", "communication", "food", "career"]),
      business: calcRel(["career", "growth", "money", "curiosity"]),
      friendship: calcRel(["leisure", "society", "curiosity", "communication"]),
      client: calcRel(["career", "money", "communication", "growth"]),
    };

    // 質問レベル分析
    const questions = await prisma.diagnosisQuestion.findMany({
      where: { activeFlag: true },
      orderBy: { displayOrder: "asc" },
    });

    const answersMapA = new Map(sessionA.answers.map((a) => [a.questionId, a.answer]));
    const answersMapB = new Map(sessionB.answers.map((a) => [a.questionId, a.answer]));

    const questionDiffs = questions.map((q) => {
      const ansA = answersMapA.get(q.id) ?? 0;
      const ansB = answersMapB.get(q.id) ?? 0;
      const effectiveA = q.reverseScore ? 6 - ansA : ansA;
      const effectiveB = q.reverseScore ? 6 - ansB : ansB;
      return {
        questionText: q.questionText,
        categoryId: q.categoryId,
        categoryLabel: CATEGORY_MAP[q.categoryId]?.label || q.categoryId,
        answerA: ansA,
        answerB: ansB,
        effectiveDiff: Math.abs(effectiveA - effectiveB),
      };
    }).sort((a, b) => b.effectiveDiff - a.effectiveDiff);

    const bigGapQuestions = questionDiffs.filter((q) => q.effectiveDiff >= 3).slice(0, 8);
    const closeQuestions = questionDiffs.filter((q) => q.effectiveDiff <= 1).slice(0, 5);

    const categoryQuestionGaps: Record<string, { total: number; bigGaps: number }> = {};
    for (const qd of questionDiffs) {
      if (!categoryQuestionGaps[qd.categoryId]) {
        categoryQuestionGaps[qd.categoryId] = { total: 0, bigGaps: 0 };
      }
      categoryQuestionGaps[qd.categoryId].total += qd.effectiveDiff;
      if (qd.effectiveDiff >= 3) categoryQuestionGaps[qd.categoryId].bigGaps += 1;
    }

    // プロフィール
    const profileA = extractProfile(sessionA.profile);
    const profileB = extractProfile(sessionB.profile);

    // AI分析用入力
    const aiInput: CompareAIInput = {
      profileA,
      profileB,
      scoresA,
      scoresB,
      mainTypeA: sessionA.score.mainType,
      mainTypeB: sessionB.score.mainType,
      subTypeA: sessionA.score.subType,
      subTypeB: sessionB.score.subType,
      compatibilityScore,
      relationScores,
      bigGapQuestions,
      closeQuestions,
      categoryQuestionGaps,
    };

    // AI呼び出し
    const report = await generateCompareAIReport(aiInput);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Compare AI report error:", error);
    return NextResponse.json(
      { success: false, error: "AI相性分析の生成に失敗しました" },
      { status: 500 }
    );
  }
}

async function generateCompareAIReport(
  input: CompareAIInput
): Promise<{ report: CompareReportJson; isFallback: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { report: buildFallbackCompareReport(input), isFallback: true };
  }

  const client = new Anthropic({ apiKey });
  const modelName = process.env.AI_MODEL_NAME || "claude-haiku-4-5-20251001";

  try {
    const message = await client.messages.create({
      model: modelName,
      max_tokens: 3000,
      system: COMPARE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildComparePrompt(input) }],
    }, {
      timeout: 45_000,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: CompareReportJson;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // JSON修復
      const repaired = repairJson(jsonText);
      parsed = JSON.parse(repaired);
    }

    // 不足セクションをフォールバックで補完
    const fallback = buildFallbackCompareReport(input);
    const merged = mergeCompareReport(parsed, fallback);

    return { report: merged, isFallback: false };
  } catch (error) {
    console.error("Compare AI generation failed:", error);
    return { report: buildFallbackCompareReport(input), isFallback: true };
  }
}

function repairJson(text: string): string {
  let s = text.trim();
  const lastGood = Math.max(
    s.lastIndexOf('",'),
    s.lastIndexOf('"}'),
    s.lastIndexOf('"]')
  );
  if (lastGood > s.length * 0.5) {
    s = s.substring(0, lastGood + 2);
  }
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }
  s = s.replace(/,\s*$/, '');
  for (let i = 0; i < openBrackets; i++) s += ']';
  for (let i = 0; i < openBraces; i++) s += '}';
  return s;
}

function mergeCompareReport(
  ai: Partial<CompareReportJson>,
  fallback: CompareReportJson
): CompareReportJson {
  const merge = (section: keyof CompareReportJson) =>
    ai[section]?.text ? ai[section] : fallback[section];
  return {
    overallAnalysis: merge("overallAnalysis"),
    strengthsAsCouple: merge("strengthsAsCouple"),
    challengeAreas: merge("challengeAreas"),
    questionLevelInsight: merge("questionLevelInsight"),
    romanceAdvice: merge("romanceAdvice"),
    marriageAdvice: merge("marriageAdvice"),
    communicationTips: merge("communicationTips"),
    profileCompatibility: merge("profileCompatibility"),
    counselorMessage: merge("counselorMessage"),
  };
}

function buildFallbackCompareReport(input: CompareAIInput): CompareReportJson {
  const score = input.compatibilityScore;
  const scoreDesc = score >= 70 ? "非常に高い相性" : score >= 50 ? "まずまずの相性" : score >= 35 ? "やや差のある" : "差が大きい";
  const bigGapCount = input.bigGapQuestions.length;
  const closeCount = input.closeQuestions.length;

  const profileNotes: string[] = [];
  if (input.profileA.ageRange && input.profileB.ageRange) {
    profileNotes.push(`年代はAさん「${input.profileA.ageRange}」、Bさん「${input.profileB.ageRange}」`);
  }
  if (input.profileA.hobbies && input.profileB.hobbies) {
    profileNotes.push(`趣味はAさん「${input.profileA.hobbies}」、Bさん「${input.profileB.hobbies}」`);
  }
  if (input.profileA.personalityType && input.profileB.personalityType) {
    profileNotes.push(`性格タイプはAさん「${input.profileA.personalityType}」、Bさん「${input.profileB.personalityType}」`);
  }

  return {
    overallAnalysis: {
      title: "2人の相性の全体像",
      text: `Aさんは「${input.mainTypeA}」、Bさんは「${input.mainTypeB}」というタイプの組み合わせです。総合相性スコアは${score}点で、${scoreDesc}と言えます。100問の個別回答を分析すると、価値観が大きくズレている質問が${bigGapCount}件、よく一致している質問が${closeCount}件見つかりました。カテゴリスコアの差だけでなく、一つひとつの質問への回答の違いが、2人の関係性をより深く理解する手がかりになります。`,
    },
    strengthsAsCouple: {
      title: "2人の強み・共通する価値観",
      text: closeCount > 0
        ? `100問の中で価値観が一致している質問が${closeCount}件以上あり、特に${input.closeQuestions.map((q) => `「${q.questionText}」`).join("、")}などで同じ方向性を持っています。こうした共通点は日常生活での安心感や信頼関係の土台になります。`
        : "2人のスコアパターンを見ると、それぞれ異なる強みを持っており、お互いを補完し合える関係性の可能性があります。異なる視点を持つことは、新しい発見や成長の機会になります。",
    },
    challengeAreas: {
      title: "すり合わせが必要な領域",
      text: bigGapCount > 0
        ? `質問レベルで大きなズレ（回答差3以上）がある項目が${bigGapCount}件見つかりました。特に${input.bigGapQuestions.slice(0, 3).map((q) => `「${q.questionText}」（A:${q.answerA} vs B:${q.answerB}）`).join("、")}などは、カテゴリスコアの差以上に価値観の根本的な違いを示しています。これらの項目について話し合うことが大切です。`
        : "質問レベルでの大きなズレは少なく、全体的に価値観の方向性が近い2人です。細かな違いはあっても、根本的な価値観の衝突は起きにくい傾向があります。",
    },
    questionLevelInsight: {
      title: "質問分析から見える深層的な違い",
      text: `100問の個別回答を分析すると、カテゴリスコアだけでは見えない重要なパターンが浮かび上がります。${bigGapCount > 0 ? `特に注目すべきは、同じカテゴリ内でも特定の質問で大きくズレている点です。例えば${input.bigGapQuestions[0] ? `「${input.bigGapQuestions[0].questionText}」で${input.bigGapQuestions[0].effectiveDiff}ポイントの差` : ""}があり、これはカテゴリ全体のスコア差以上に、具体的な場面での価値観の違いを示しています。` : "全体的に個別質問のズレが小さく、カテゴリスコアと実際の回答傾向が一致しています。"}スコアが近くても質問レベルで真逆の回答がある場合、その項目は特に話し合いの優先度が高いです。`,
    },
    romanceAdvice: {
      title: "恋愛関係へのアドバイス",
      text: `恋愛相性は${input.relationScores.romance}点です。${input.relationScores.romance >= 60 ? "お金・コミュニケーション・家庭観で共通点が多く、自然体で一緒にいられる関係です。" : "価値観に違いがある部分もありますが、それは「お互いに学び合える部分」とも言えます。"}${profileNotes.length > 0 ? profileNotes[0] + "。" : ""}デートや日常の過ごし方について、お互いの希望を率直に伝え合うことが大切です。`,
    },
    marriageAdvice: {
      title: "結婚生活へのアドバイス",
      text: `結婚相性は${input.relationScores.marriage}点です。結婚生活では特にお金・家庭観・キャリア観の一致が重要です。${input.relationScores.marriage >= 60 ? "これらの領域で比較的近い価値観を持っており、安定した家庭を築きやすい組み合わせです。" : "いくつかの領域で価値観の違いがあるため、結婚前に具体的な生活プラン（家計管理、家事分担、将来設計）について話し合っておくことをお勧めします。"}`,
    },
    communicationTips: {
      title: "コミュニケーションのコツ",
      text: "価値観の違いを「正しい・正しくない」で判断せず、「あなたはそう感じるんだね」と受け止める姿勢が大切です。特にスコアの差が大きいカテゴリについて話すときは、相手の背景や経験を聴くことから始めましょう。",
    },
    profileCompatibility: {
      title: "プロフィールから見る生活相性",
      text: profileNotes.length > 0
        ? `プロフィールを比較すると、${profileNotes.join("、")}です。これらの属性の違いは、日常の過ごし方や生活リズムに影響します。共通する趣味や関心事があれば、自然と一緒に過ごす時間が増え、相性の良さを実感しやすくなります。`
        : "プロフィール情報を充実させると、趣味や生活スタイルの相性もより詳しく分析できます。お互いのプロフィールを見比べて、共通点を探してみてください。",
    },
    counselorMessage: {
      title: "カウンセラーからのメッセージ",
      text: `お二人の診断結果を拝見しました。総合${score}点という結果は、${scoreDesc}を示しています。大切なのは点数そのものではなく、お互いの価値観を「知る」ことです。この診断をきっかけに、ぜひお互いの考え方について話し合ってみてください。`,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProfile(profile: any): Record<string, string> {
  if (!profile) return {};
  const result: Record<string, string> = {};
  const fields = [
    "birthDate", "gender", "ageRange", "birthPlace", "currentResidence",
    "favoriteMusic", "occupation", "familyStructure", "lifestyle",
    "smartphone", "snsUsage", "foodPreference", "financialHabit",
    "friendCount", "parentRelationship", "hobbies", "transportation",
    "personalityType", "clubActivity", "beautyInterest", "itLiteracy", "moneyLiteracy",
    "meetingHistory", "partnerMeetingWay", "futurePlan",
  ];
  for (const f of fields) {
    if (profile[f]) result[f] = profile[f];
  }
  return result;
}
