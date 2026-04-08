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
 * Vercel Hobby (60秒制限) でも完了できるようHaikuモデルを使用
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

  // Haiku（高速・Vercel 60秒制限内で完了可能）をデフォルトに
  // 長時間タイムアウトが使える環境ではAI_MODEL_NAMEでSonnet等に切替可能
  const modelName = process.env.AI_MODEL_NAME || "claude-haiku-4-5-20251001";
  const maxTokens = isRegenerate ? 3500 : 4096;

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
    }, {
      timeout: 45_000, // 45秒タイムアウト（Vercel 60秒制限内に収める）
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in response");
    }

    // JSONパース（途中切れ対策を含む）
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: ReportJson;
    try {
      parsed = JSON.parse(jsonText) as ReportJson;
    } catch {
      // max_tokensで途中切れした場合、JSONを修復して再パースを試みる
      console.warn("JSON parse failed, attempting repair...");
      const repaired = repairTruncatedJson(jsonText);
      parsed = JSON.parse(repaired) as ReportJson;
    }

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
 * 途中切れしたJSONを修復する
 * max_tokensで出力が切れた場合に閉じ括弧を補完
 */
function repairTruncatedJson(text: string): string {
  let s = text.trim();
  // 末尾の不完全な文字列を除去（途中の "text": "..." が切れている場合）
  // 最後の完全なプロパティまで巻き戻す
  const lastCompleteComma = s.lastIndexOf('",');
  const lastCompleteBrace = s.lastIndexOf('"}');
  const lastCompleteBracket = s.lastIndexOf('"]');
  const lastGood = Math.max(lastCompleteComma, lastCompleteBrace, lastCompleteBracket);

  if (lastGood > s.length * 0.5) {
    // 切れた位置以降を除去
    s = s.substring(0, lastGood + 2);
  }

  // 閉じ括弧を補完
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

  // 不要な末尾のカンマを除去
  s = s.replace(/,\s*$/, '');

  for (let i = 0; i < openBrackets; i++) s += ']';
  for (let i = 0; i < openBraces; i++) s += '}';

  return s;
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
    compatibilityAnalysis: ai.compatibilityAnalysis?.romance?.text
      ? ai.compatibilityAnalysis
      : fallback.compatibilityAnalysis,
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
