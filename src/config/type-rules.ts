/**
 * タイプ判定ルール（設定ファイル化）
 *
 * ルールベース判定:
 * - 上位2カテゴリの組み合わせで主タイプを決定
 * - 3位カテゴリでサブタイプを決定
 *
 * 後から編集しやすいように、配列で定義しています。
 */

export interface MainTypeRule {
  /** この2つのカテゴリが上位2位以内にあれば該当 */
  categories: [string, string];
  typeName: string;
}

export interface SubTypeRule {
  /** このカテゴリが3位にあれば該当 */
  categoryId: string;
  typeName: string;
}

// ========== 主タイプ判定ルール ==========
// 上位2カテゴリの組み合わせでマッチ（順序不問）
export const MAIN_TYPE_RULES: MainTypeRule[] = [
  { categories: ["money", "communication"], typeName: "安心を育てる現実派" },
  { categories: ["money", "career"], typeName: "堅実に未来を描く戦略家" },
  { categories: ["money", "family"], typeName: "家庭を守る安定志向型" },
  { categories: ["money", "growth"], typeName: "成長と安定の両立追求型" },
  { categories: ["money", "selfcare"], typeName: "自分を大切にする堅実派" },
  { categories: ["career", "growth"], typeName: "成長志向の伴走型" },
  { categories: ["career", "communication"], typeName: "対話で道を拓くリーダー型" },
  { categories: ["career", "curiosity"], typeName: "挑戦を楽しむ開拓者" },
  { categories: ["family", "selfcare"], typeName: "穏やかな安定重視型" },
  { categories: ["family", "communication"], typeName: "温かさで繋がる共感型" },
  { categories: ["family", "food"], typeName: "暮らしを丁寧に紡ぐ型" },
  { categories: ["curiosity", "leisure"], typeName: "自由と刺激を大切にする探究型" },
  { categories: ["curiosity", "growth"], typeName: "知的好奇心旺盛な学び型" },
  { categories: ["selfcare", "leisure"], typeName: "自分時間を愛するマイペース型" },
  { categories: ["communication", "society"], typeName: "社会と対話で繋がる共創型" },
  { categories: ["growth", "society"], typeName: "志を持つ社会貢献型" },
  { categories: ["food", "leisure"], typeName: "日々を味わう感覚派" },
  { categories: ["society", "curiosity"], typeName: "世界を広げる探究者" },
  { categories: ["selfcare", "growth"], typeName: "内省と成長のバランス型" },
  { categories: ["communication", "growth"], typeName: "対話から学ぶ成長型" },
];

// デフォルトの主タイプ（どのルールにもマッチしない場合）
export const DEFAULT_MAIN_TYPE = "バランス重視の調和型";

// ========== サブタイプ判定ルール ==========
// 3位カテゴリに基づいて決定
export const SUB_TYPE_RULES: SubTypeRule[] = [
  { categoryId: "money", typeName: "経済的安定を基盤にする慎重型" },
  { categoryId: "food", typeName: "暮らしの質にこだわる感性型" },
  { categoryId: "family", typeName: "家庭的な温かさを大切にする型" },
  { categoryId: "selfcare", typeName: "心身のバランスを整える調律型" },
  { categoryId: "career", typeName: "仕事を通じて自己実現する型" },
  { categoryId: "leisure", typeName: "遊び心を忘れない自由型" },
  { categoryId: "society", typeName: "社会との繋がりを重視する型" },
  { categoryId: "curiosity", typeName: "好奇心で世界を広げる冒険型" },
  { categoryId: "growth", typeName: "学びを深めて進化し続ける型" },
  { categoryId: "communication", typeName: "対話で信頼を深める共感型" },
];

// デフォルトのサブタイプ
export const DEFAULT_SUB_TYPE = "多面的な魅力を持つ柔軟型";
