import { CATEGORIES, MONEY_WEIGHT } from "@/config/categories";
import { QUESTIONS } from "@/config/questions";
import { CategoryScores } from "@/types";

interface AnswerRow {
  questionId: string;
  categoryId: string;
  answer: number;
}

/**
 * カテゴリ別スコアを計算
 * reverseScore の場合は 6 - answer で変換
 */
export function calculateCategoryScores(answers: AnswerRow[]): CategoryScores {
  const questionMap = new Map(QUESTIONS.map((q) => [q.id, q]));
  const scores: CategoryScores = {};

  // 全カテゴリを0で初期化
  for (const cat of CATEGORIES) {
    scores[cat.id] = 0;
  }

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    const value = question.reverseScore ? 6 - ans.answer : ans.answer;
    scores[ans.categoryId] = (scores[ans.categoryId] || 0) + value;
  }

  return scores;
}

/**
 * 重み付きスコアを計算（お金観カテゴリの重み係数適用）
 */
export function calculateWeightedScores(
  categoryScores: CategoryScores
): CategoryScores {
  const weighted: CategoryScores = {};
  for (const [catId, score] of Object.entries(categoryScores)) {
    weighted[catId] =
      catId === "money"
        ? Math.round(score * MONEY_WEIGHT * 10) / 10
        : score;
  }
  return weighted;
}

/**
 * 高得点カテゴリ上位3つを抽出
 * 同点時: moneyを優先、それ以外はカテゴリ定義順
 */
export function getHighCategories(categoryScores: CategoryScores): string[] {
  return getSortedCategories(categoryScores, "desc").slice(0, 3);
}

/**
 * 低得点カテゴリ下位2つを抽出
 */
export function getLowCategories(categoryScores: CategoryScores): string[] {
  return getSortedCategories(categoryScores, "asc").slice(0, 2);
}

function getSortedCategories(
  scores: CategoryScores,
  order: "asc" | "desc"
): string[] {
  const categoryOrder = new Map(CATEGORIES.map((c) => [c.id, c.order]));

  return Object.entries(scores)
    .sort(([aId, aScore], [bId, bScore]) => {
      const diff = order === "desc" ? bScore - aScore : aScore - bScore;
      if (diff !== 0) return diff;
      // 同点時: moneyを優先的に上位に
      if (aId === "money") return -1;
      if (bId === "money") return 1;
      // それ以外はカテゴリ定義順
      return (categoryOrder.get(aId) || 0) - (categoryOrder.get(bId) || 0);
    })
    .map(([catId]) => catId);
}
