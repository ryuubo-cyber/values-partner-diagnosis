import { ReportJson, CategoryScores } from "@/types";
import { CATEGORY_MAP, CATEGORIES } from "@/config/categories";

interface FallbackInput {
  profile: Record<string, string>;
  scores: CategoryScores;
  highCategories: string[];
  lowCategories: string[];
  mainType: string;
  subType: string;
}

/**
 * AI生成失敗時のフォールバックレポート
 * 最低限の診断結果を返す
 */
export function generateFallbackReport(input: FallbackInput): ReportJson {
  const { scores, highCategories, lowCategories, mainType, subType } = input;

  const highLabels = highCategories.map((c) => CATEGORY_MAP[c]?.label || c);
  const lowLabels = lowCategories.map((c) => CATEGORY_MAP[c]?.label || c);

  return {
    mainType,
    subType,
    overallType: {
      title: `${mainType} × ${subType}`,
      text: `あなたの診断結果は「${mainType}」タイプです。サブタイプとして「${subType}」の傾向も持ち合わせています。特に${highLabels.join("、")}の領域で高い関心やこだわりを持っていることが特徴的です。一方で${lowLabels.join("、")}の領域では、比較的リラックスした姿勢で向き合っている様子がうかがえます。この結果はあなたの価値観の傾向を示すものであり、AIによる詳細な分析レポートは現在生成できませんでしたが、スコアの分布からあなたの価値観の全体像を読み取ることができます。`,
    },
    highScoreDeepDive: highCategories.map((catId) => ({
      categoryId: catId,
      title: CATEGORY_MAP[catId]?.label || catId,
      text: `${CATEGORY_MAP[catId]?.label || catId}のスコアは${scores[catId]}点で、あなたの上位カテゴリです。この領域に対して強い関心や明確な価値観を持っていることが読み取れます。`,
    })),
    categoryFeedbacks: CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      title: cat.label,
      score: scores[cat.id] || 0,
      text: `${cat.label}のスコアは${scores[cat.id] || 0}点（50点満点）です。${
        (scores[cat.id] || 0) >= 35
          ? "この領域に対して比較的高い意識や関心を持っています。"
          : (scores[cat.id] || 0) >= 25
          ? "この領域については平均的な関心度合いです。"
          : "この領域に対しては比較的穏やかな姿勢で向き合っています。"
      }`,
    })),
    idealPartnerAnalysis: {
      title: "理想のパートナー像と相性分析",
      text: `あなたの価値観パターンから、${highLabels.join("や")}を大切にするパートナーとの相性が良いと考えられます。詳細なAI分析は現在利用できませんが、スコアの傾向から参考にしていただけます。`,
    },
    compatibilityTop5: {
      romance: Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1,
        typeName: `相性タイプ${i + 1}`,
        reason: "詳細なAI分析が完了次第、具体的な相性情報をお伝えします。",
      })),
      marriage: Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1,
        typeName: `相性タイプ${i + 1}`,
        reason: "詳細なAI分析が完了次第、具体的な相性情報をお伝えします。",
      })),
      business: Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1,
        typeName: `相性タイプ${i + 1}`,
        reason: "詳細なAI分析が完了次第、具体的な相性情報をお伝えします。",
      })),
    },
    encounterHints: {
      title: "出会いのヒント",
      text: `あなたの価値観に合った出会いの場として、${highLabels[0]}に関連するコミュニティや活動がおすすめです。自然体で参加できる場所を選ぶことが大切です。`,
    },
    moneyAnalysis: {
      title: "お金観・経済感覚の深層分析",
      text: `お金観・経済感覚のスコアは${scores["money"] || 0}点です。${
        (scores["money"] || 0) >= 35
          ? "お金に対して明確な価値観と方針を持っていることがうかがえます。経済的な安定を重視しつつ、計画的な金銭管理を意識している傾向があります。"
          : "お金に対して柔軟な姿勢で向き合っている傾向があります。"
      }`,
    },
    loveAndMarriageAnalysis: {
      title: "恋愛傾向・結婚観・自己防衛パターン",
      text: `あなたの全体的なスコアパターンから、恋愛や結婚に対して${
        (scores["family"] || 0) >= 35 ? "積極的で" : "慎重で"
      }${
        (scores["communication"] || 0) >= 35 ? "対話を大切にする" : "自分のペースを大切にする"
      }傾向がうかがえます。`,
    },
    counselorMessage: {
      title: "最後にカウンセラーからのメッセージ",
      text: `診断を受けてくださりありがとうございます。あなたの「${mainType}」という結果は、あなたの価値観の豊かさを表しています。この結果をきっかけに、ご自身の大切にしていることをあらためて見つめ直していただければ幸いです。どんな価値観にも正解・不正解はありません。あなたらしさを大切に、素敵な出会いにつながることを願っています。`,
    },
  };
}
