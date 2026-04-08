import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildReportPrompt } from "@/config/prompts";
import { ReportJson, CategoryScores } from "@/types";
import { generateFallbackReport } from "./fallback-report";

interface GenerateReportInput {
  profile: Record<string, string>;
  scores: CategoryScores;
  highCategories: string[];
  lowCategories: string[];
  mainType: string;
  subType: string;
}

/**
 * Claude APIを使ってAIレポートを生成
 * isRegenerate=true の場合は高速モデル（Haiku）を使用
 */
export async function generateAIReport(
  input: GenerateReportInput,
  isRegenerate = false
): Promise<{ reportJson: ReportJson; modelName: string; isFallback: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, using fallback report");
    return {
      reportJson: generateFallbackReport(input),
      modelName: "fallback",
      isFallback: true,
    };
  }

  const client = new Anthropic({ apiKey });

  // 再生成時はHaiku（高速・低コスト）、初回はSonnet
  const modelName = isRegenerate
    ? "claude-haiku-4-5-20251001"
    : (process.env.AI_MODEL_NAME || "claude-sonnet-4-20250514");
  const maxTokens = isRegenerate ? 3000 : 4096;

  try {
    const message = await client.messages.create({
      model: modelName,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildReportPrompt(input),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in response");
    }

    // JSONパース
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText) as ReportJson;

    if (!parsed.mainType || !parsed.overallType?.text) {
      throw new Error("Essential fields missing from AI response");
    }

    // 不足フィールドをフォールバックで補完
    const fallback = generateFallbackReport(input);
    const merged = mergeWithFallback(parsed, fallback);

    return { reportJson: merged, modelName, isFallback: false };
  } catch (error) {
    console.error("AI report generation failed:", error);
    return {
      reportJson: generateFallbackReport(input),
      modelName: "fallback",
      isFallback: true,
    };
  }
}

/**
 * AI生成結果の不足部分をフォールバックで補完
 */
function mergeWithFallback(ai: ReportJson, fallback: ReportJson): ReportJson {
  return {
    mainType: ai.mainType || fallback.mainType,
    subType: ai.subType || fallback.subType,
    overallType: ai.overallType?.text ? ai.overallType : fallback.overallType,
    categoryFeedbacks:
      ai.categoryFeedbacks && ai.categoryFeedbacks.length >= 10
        ? ai.categoryFeedbacks
        : fallback.categoryFeedbacks,
    highScoreDeepDive:
      ai.highScoreDeepDive && ai.highScoreDeepDive.length >= 3
        ? ai.highScoreDeepDive
        : fallback.highScoreDeepDive,
    idealPartnerAnalysis: ai.idealPartnerAnalysis?.text
      ? ai.idealPartnerAnalysis
      : fallback.idealPartnerAnalysis,
    compatibilityTop5: ai.compatibilityTop5?.romance?.length
      ? ai.compatibilityTop5
      : fallback.compatibilityTop5,
    encounterHints: ai.encounterHints?.text
      ? ai.encounterHints
      : fallback.encounterHints,
    moneyAnalysis: ai.moneyAnalysis?.text
      ? ai.moneyAnalysis
      : fallback.moneyAnalysis,
    loveAndMarriageAnalysis: ai.loveAndMarriageAnalysis?.text
      ? ai.loveAndMarriageAnalysis
      : fallback.loveAndMarriageAnalysis,
    counselorMessage: ai.counselorMessage?.text
      ? ai.counselorMessage
      : fallback.counselorMessage,
    compatibilityNarrative: ai.compatibilityNarrative || fallback.compatibilityNarrative,
    regionalCompatibility: ai.regionalCompatibility || fallback.regionalCompatibility,
    fourPillarsInsight: ai.fourPillarsInsight || fallback.fourPillarsInsight,
    partnerCheckGuide: ai.partnerCheckGuide || fallback.partnerCheckGuide,
  };
}
