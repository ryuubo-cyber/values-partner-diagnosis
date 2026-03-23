import { CategoryDef } from "@/types";

export const CATEGORIES: CategoryDef[] = [
  { id: "money", label: "お金観・経済感覚", order: 1 },
  { id: "food", label: "食のこだわりと選択基準", order: 2 },
  { id: "family", label: "家庭観・人間関係の理想像", order: 3 },
  { id: "selfcare", label: "心身セルフマネジメント", order: 4 },
  { id: "career", label: "働き方観・キャリア志向", order: 5 },
  { id: "leisure", label: "嗜好・時間の使い方", order: 6 },
  { id: "society", label: "社会観・つながりのあり方", order: 7 },
  { id: "curiosity", label: "探究心・行動スタイル", order: 8 },
  { id: "growth", label: "学び方・自己成長志向", order: 9 },
  { id: "communication", label: "対人関係スタイル・対話傾向", order: 10 },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export const ANSWER_SCALE = {
  1: "まったくあてはまらない",
  2: "あまりあてはまらない",
  3: "どちらともいえない",
  4: "あてはまる",
  5: "とてもあてはまる",
} as const;

/** お金観カテゴリの重み係数 */
export const MONEY_WEIGHT = 1.2;

/** 全問数 */
export const TOTAL_QUESTIONS = 100;

/** 1セットあたりの問数 */
export const QUESTIONS_PER_SET = 10;

/** セット数 */
export const TOTAL_SETS = TOTAL_QUESTIONS / QUESTIONS_PER_SET;
