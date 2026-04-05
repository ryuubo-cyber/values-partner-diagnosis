import {
  MAIN_TYPE_RULES,
  SUB_TYPE_RULES,
  DEFAULT_MAIN_TYPE,
  DEFAULT_SUB_TYPE,
} from "@/config/type-rules";

/**
 * ルールベースの主タイプ判定
 * 上位2カテゴリの組み合わせでマッチ（順序不問）
 */
export function judgeMainType(highCategories: string[]): string {
  const top2 = new Set(highCategories.slice(0, 2));

  for (const rule of MAIN_TYPE_RULES) {
    const [cat1, cat2] = rule.categories;
    if (top2.has(cat1) && top2.has(cat2)) {
      return rule.typeName;
    }
  }

  return DEFAULT_MAIN_TYPE;
}

/**
 * ルールベースのサブタイプ判定
 * 3位カテゴリに基づいて決定
 */
export function judgeSubType(highCategories: string[]): string {
  const thirdCategory = highCategories[2];
  if (!thirdCategory) return DEFAULT_SUB_TYPE;

  const rule = SUB_TYPE_RULES.find((r) => r.categoryId === thirdCategory);
  return rule ? rule.typeName : DEFAULT_SUB_TYPE;
}
