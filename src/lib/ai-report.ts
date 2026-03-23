import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildReportPrompt } from "@/config/prompts";
import { ReportJson, CategoryScores } from "@/types";
import { generateFallbackReport } from "./fallback-report";
import { CATEGORY_MAP } from "@/config/categories";

const MAX_RETRIES = 3;

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
 * 失敗時はリトライし、それでもダメならフォールバック
 */
export async function generateAIReport(
  input: GenerateReportInput
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
  const modelName = process.env.AI_MODEL_NAME || "claude-sonnet-4-20250514";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: modelName,
        max_tokens: 8192,
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
      // コードブロックで囲まれている場合を処理
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonText) as ReportJson;

      // 必須フィールドの検証
      validateReport(parsed);

      return { reportJson: parsed, modelName, isFallback: false };
    } catch (error) {
      console.error(`AI report generation attempt ${attempt} failed:`, error);
      if (attempt === MAX_RETRIES) {
        console.warn("All retries failed, using fallback report");
        return {
          reportJson: generateFallbackReport(input),
          modelName: "fallback",
          isFallback: true,
        };
      }
    }
  }

  // Should not reach here, but just in case
  return {
    reportJson: generateFallbackReport(input),
    modelName: "fallback",
    isFallback: true,
  };
}

function validateReport(report: ReportJson): void {
  if (!report.mainType) throw new Error("Missing mainType");
  if (!report.subType) throw new Error("Missing subType");
  if (!report.overallType?.text) throw new Error("Missing overallType");
  if (!report.categoryFeedbacks || report.categoryFeedbacks.length < 10) {
    throw new Error("categoryFeedbacks must have 10 items");
  }
  if (!report.highScoreDeepDive || report.highScoreDeepDive.length < 3) {
    throw new Error("highScoreDeepDive must have at least 3 items");
  }
  if (!report.moneyAnalysis?.text) throw new Error("Missing moneyAnalysis");
  if (!report.counselorMessage?.text) throw new Error("Missing counselorMessage");
}
