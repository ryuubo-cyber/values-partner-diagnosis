import { ReportJson, CategoryScores } from "@/types";
import { CATEGORY_MAP, CATEGORIES } from "@/config/categories";
import { calculateFourPillars, buildIntegratedInsight } from "./four-pillars";

interface FallbackInput {
  profile: Record<string, string>;
  scores: CategoryScores;
  highCategories: string[];
  lowCategories: string[];
  mainType: string;
  subType: string;
}

// カテゴリごとの深掘りテンプレート
const CATEGORY_DEEP_DIVE: Record<string, { high: string; mid: string; low: string }> = {
  money: {
    high: "お金に対して明確な価値観と方針を持っている傾向があります。日々の支出を意識し、将来の経済的な安定に向けて計画的に行動できるタイプです。パートナーとの間でもお金の話をオープンにできる姿勢があり、経済面での信頼関係を築きやすいでしょう。衝動的な出費よりも納得感のある使い方を好み、貯蓄や資産形成にも関心を持っています。この堅実さは、長期的なパートナーシップにおいて大きな安心材料になります。",
    mid: "お金に対してバランスの取れた感覚を持っている傾向があります。必要な場面では慎重に判断しつつも、楽しみへの出費にも柔軟です。パートナーとの経済観のすり合わせを意識することで、より安定した関係を築けるでしょう。",
    low: "お金に対しては比較的おおらかな姿勢で向き合っている傾向があります。細かい管理よりも、今を楽しむことを大切にするタイプかもしれません。パートナーとの生活では、お金について話し合う機会を意識的に設けると、お互いの安心感が高まるでしょう。",
  },
  food: {
    high: "食に対するこだわりや意識が高い傾向があります。食事の時間を大切にし、何を食べるか、誰と食べるかに価値を置いているようです。パートナーとの食卓を共有する時間は、あなたにとって大切なコミュニケーションの場になるでしょう。料理や食材への関心も高く、生活の質を食から高めていくタイプです。",
    mid: "食に対してほどよいこだわりを持っている傾向があります。健康や味のバランスを意識しつつ、食事を楽しむ姿勢があります。パートナーとの食の好みが合うかどうかも、相性のポイントになりそうです。",
    low: "食に対しては効率や手軽さを重視する傾向があるかもしれません。食事そのものよりも、他の活動に時間やエネルギーを使いたいタイプです。パートナーが食にこだわるタイプの場合は、お互いの価値観をすり合わせることが大切です。",
  },
  family: {
    high: "家庭や家族との関係に対して強い理想と価値観を持っている傾向があります。温かい家庭環境を築きたいという思いが強く、パートナーとの対等で安定した関係を望んでいるようです。結婚や家族形成に対して前向きで、家族の絆を大切にするタイプです。",
    mid: "家庭観についてはバランスの取れた考え方を持っている傾向があります。家族との関係は大切にしつつも、自分の時間や個人の成長も同様に重視しています。",
    low: "家庭や家族に対しては、今は自分自身の充実を優先したい傾向があるかもしれません。将来的な家庭像よりも、現在の自分の生き方を大切にしているタイプです。",
  },
  selfcare: {
    high: "心身の健康管理に対する意識が高い傾向があります。運動習慣やストレス対処法を持ち、自分自身を丁寧にケアすることを大切にしています。パートナーにも健康意識があることを望む傾向があり、一緒に心身の充実を目指せる関係が理想的でしょう。",
    mid: "セルフケアに対してほどよい意識を持っている傾向があります。無理をしすぎず、自分のペースで心身のバランスを保つことを心がけているようです。",
    low: "セルフケアに対しては、あまり堅く考えすぎず自然体で過ごしている傾向があります。ストレスへの対処法を少し意識的に持つことで、パートナーとの関係もより安定するかもしれません。",
  },
  career: {
    high: "仕事やキャリアに対して高い意識と情熱を持っている傾向があります。やりがいや社会貢献を重視し、自己成長の場として仕事を捉えているようです。パートナーにも仕事への理解を求め、お互いのキャリアを応援し合える関係が理想的です。",
    mid: "キャリアに対してバランスの取れた姿勢を持っている傾向があります。仕事の充実と私生活の調和を大切にし、ワークライフバランスを意識しているようです。",
    low: "キャリアに対しては、仕事以外の部分に人生の充実を求める傾向があるかもしれません。働き方よりも、生活の質や人間関係を重視するタイプです。",
  },
  leisure: {
    high: "趣味や自分の時間の使い方に対してこだわりがある傾向があります。余暇の過ごし方に豊かさを求め、趣味や旅行、体験に積極的に投資するタイプです。パートナーとは趣味を共有したり、お互いの自由な時間を尊重し合える関係が心地よいでしょう。",
    mid: "趣味や余暇に対してほどよく楽しむ姿勢を持っている傾向があります。インドアもアウトドアもバランスよく楽しめるタイプです。",
    low: "余暇の過ごし方にはあまり強いこだわりがない傾向があります。趣味よりも仕事や人間関係など、他の領域にエネルギーを注いでいるタイプかもしれません。",
  },
  society: {
    high: "社会とのつながりや地域コミュニティに対して高い関心を持っている傾向があります。多様な価値観を受け入れ、社会貢献やボランティア活動にも興味があるようです。パートナーとも社会的な価値観を共有できると、より深い絆が生まれるでしょう。",
    mid: "社会とのつながりに対してバランスの取れた姿勢を持っている傾向があります。必要な場面では社会参加しつつも、自分の生活圏を大切にしています。",
    low: "社会的な活動よりも、身近な人間関係や個人の世界を重視する傾向があります。狭く深い人間関係を好むタイプかもしれません。",
  },
  curiosity: {
    high: "新しいことへの挑戦や探究心が旺盛な傾向があります。未知の経験にワクワクし、変化を楽しめるタイプです。パートナーとも一緒に新しい体験をしたり、お互いの好奇心を刺激し合える関係が理想的でしょう。冒険心と行動力が、あなたの大きな魅力です。",
    mid: "好奇心についてはバランスの取れた姿勢を持っている傾向があります。新しいことにも興味はあるものの、安定した日常も大切にしています。",
    low: "新しいことよりも、慣れ親しんだ環境や安定した日常を好む傾向があります。堅実で落ち着いた性格は、長期的な関係において安心感を与える大きな魅力です。",
  },
  growth: {
    high: "自己成長や学びに対して強い意欲を持っている傾向があります。本やセミナーでの学び、目標設定と計画的な取り組みを通じて、常に自分を高めようとしています。パートナーとは互いに高め合える関係が理想的で、成長志向を共有できる相手との相性が良いでしょう。",
    mid: "自己成長に対してほどよい意識を持っている傾向があります。無理なく自分のペースで学びを深めるタイプです。",
    low: "自己成長に対しては、あまり意識的に追求するよりも自然体で過ごすことを好む傾向があります。ありのままの自分を大切にする姿勢は、一つの魅力です。",
  },
  communication: {
    high: "対人関係やコミュニケーションに対して高い意識を持っている傾向があります。自分の気持ちを言葉にして伝えることが得意で、相手の話をじっくり聞く姿勢もあります。パートナーとは本音で話し合える関係を求め、対話を通じて信頼を深めていくタイプです。感謝や愛情を言葉で伝えることも自然にできるでしょう。",
    mid: "コミュニケーションに対してバランスの取れた姿勢を持っている傾向があります。必要な場面ではしっかり対話しつつも、沈黙の時間も大切にできます。",
    low: "コミュニケーションに対しては控えめな傾向があるかもしれません。言葉よりも態度や行動で気持ちを示すタイプです。パートナーとは、お互いのコミュニケーションスタイルを理解し合うことが大切です。",
  },
};

// 友人相性タイプのテンプレート
const FRIENDSHIP_TYPES = [
  { typeName: "価値観を共有しやすい共感型", reason: "大切にしていることが似ていて、自然体で話せる居心地の良い存在です。" },
  { typeName: "刺激し合えるライバル型", reason: "お互いに高め合いながら、切磋琢磨できる関係です。" },
  { typeName: "違いを楽しめる異端の友", reason: "自分にない視点を持つ相手で、新鮮な気づきをもたらしてくれます。" },
  { typeName: "長く付き合える安定の友人型", reason: "波風なく、ゆったりした時間を共有できる安心感のある存在です。" },
  { typeName: "行動力があり一緒に動ける相棒型", reason: "「やろう」と言ったらすぐ動ける、頼れる行動の同志です。" },
];

// クライアント相性タイプのテンプレート
const CLIENT_TYPES = [
  { typeName: "信頼を大切にする誠実型クライアント", reason: "約束を守り、長期的な関係を育てられるパートナーです。" },
  { typeName: "明確なビジョンを持つ決断型クライアント", reason: "方向性が明確で、スムーズに仕事を進められます。" },
  { typeName: "共に成長したい学習志向型クライアント", reason: "フィードバックを活かし、一緒に成果を高めていける相手です。" },
  { typeName: "柔軟で変化に強い適応型クライアント", reason: "状況の変化に対応しながら協力し合える関係です。" },
  { typeName: "細部まで丁寧な品質重視型クライアント", reason: "高い基準を共有し、質の高い仕事を一緒に作れます。" },
];

// 相性タイプのテンプレート
const ROMANCE_TYPES = [
  { typeName: "堅実で会話を大切にする安定型", reason: "お互いの価値観を言葉で確認し合い、安心感のある関係を築けるタイプです。" },
  { typeName: "共感力が高く寄り添える包容型", reason: "あなたの気持ちに寄り添い、感情面でのサポートが得意なタイプです。" },
  { typeName: "好奇心旺盛で刺激を与えてくれる冒険型", reason: "マンネリに陥りにくく、新しい体験を一緒に楽しめる相手です。" },
  { typeName: "自分の軸を持った自立型", reason: "依存しすぎず、お互いの個性を尊重し合える関係を築けます。" },
  { typeName: "穏やかで癒しを与えてくれる調和型", reason: "一緒にいるだけで落ち着ける、安らぎのある関係が期待できます。" },
];

const MARRIAGE_TYPES = [
  { typeName: "生活感覚の近い協力型", reason: "家事や家計管理など、日常生活をスムーズに共有できるタイプです。" },
  { typeName: "将来設計を一緒に描ける計画型", reason: "長期的な目標を共有し、二人で着実に歩んでいける相手です。" },
  { typeName: "家族思いで温かい家庭を築ける温厚型", reason: "家庭環境を大切にし、子育てや家族行事にも積極的なタイプです。" },
  { typeName: "経済観念がしっかりした堅実パートナー型", reason: "お金の使い方に共通認識があり、経済的に安定した家庭を築けます。" },
  { typeName: "柔軟で変化に対応できる適応型", reason: "ライフステージの変化にも柔軟に対応し、支え合える関係です。" },
];

const BUSINESS_TYPES = [
  { typeName: "責任感のある実務協働型", reason: "約束を守り、確実に仕事を遂行する信頼できるパートナーです。" },
  { typeName: "アイデア豊富な創造的パートナー型", reason: "新しい視点や発想で、プロジェクトに刺激を与えてくれます。" },
  { typeName: "コミュニケーション力の高い橋渡し型", reason: "チーム内の調整やクライアント対応に長けているタイプです。" },
  { typeName: "分析力に優れた戦略思考型", reason: "データや事実に基づいた判断で、的確な方向性を示してくれます。" },
  { typeName: "行動力のある推進型", reason: "スピード感を持って物事を前に進める、頼れるパートナーです。" },
];

function getLevel(score: number): "high" | "mid" | "low" {
  if (score >= 35) return "high";
  if (score >= 25) return "mid";
  return "low";
}

/**
 * AI生成失敗時のフォールバックレポート
 * スコアに基づいた具体的な診断結果を返す
 */
export function generateFallbackReport(input: FallbackInput): ReportJson {
  const { scores, highCategories, lowCategories, mainType, subType, profile } = input;

  const highLabels = highCategories.map((c) => CATEGORY_MAP[c]?.label || c);
  const lowLabels = lowCategories.map((c) => CATEGORY_MAP[c]?.label || c);

  const profileNote = profile.occupation ? `${profile.occupation}として日々を過ごすあなたは、` : "あなたは、";

  return {
    mainType,
    subType,
    overallType: {
      title: `${mainType} × ${subType}`,
      text: `${profileNote}「${mainType}」というタイプに分類されました。サブタイプとして「${subType}」の傾向も持ち合わせています。\n\nあなたの診断結果を見ると、特に${highLabels.join("、")}の領域で高い関心やこだわりを持っていることが特徴的です。これらの領域において、あなたは明確な価値観と自分なりの基準を持って日々の判断をしている傾向があります。\n\n一方で、${lowLabels.join("、")}の領域では、比較的リラックスした姿勢で向き合っている様子がうかがえます。これは決して関心がないということではなく、他の領域により強い優先順位を置いているということです。\n\nこのバランスは、あなたの個性そのものです。パートナーとの関係においては、あなたが大切にしている領域を共有できる相手との出会いが、より深い信頼関係につながるでしょう。自分の価値観を理解し、それを言語化できることは、素敵なパートナーシップへの第一歩です。`,
    },
    highScoreDeepDive: highCategories.map((catId) => {
      const template = CATEGORY_DEEP_DIVE[catId];
      const level = getLevel(scores[catId] || 0);
      return {
        categoryId: catId,
        title: CATEGORY_MAP[catId]?.label || catId,
        text: template ? template[level] : `${CATEGORY_MAP[catId]?.label || catId}のスコアは${scores[catId]}点（50点満点）で、あなたの上位カテゴリです。この領域に対して強い関心や明確な価値観を持っていることが読み取れます。`,
      };
    }),
    categoryFeedbacks: CATEGORIES.map((cat) => {
      const score = scores[cat.id] || 0;
      const template = CATEGORY_DEEP_DIVE[cat.id];
      const level = getLevel(score);
      return {
        categoryId: cat.id,
        title: cat.label,
        score,
        text: template ? template[level] : `${cat.label}のスコアは${score}点（50点満点）です。`,
      };
    }),
    idealPartnerAnalysis: {
      title: "理想のパートナー像と相性分析",
      text: `あなたのスコアパターンから、理想のパートナー像が浮かび上がってきます。\n\nあなたが特に大切にしている${highLabels[0]}と${highLabels[1]}の領域で価値観が近い相手との相性が良いでしょう。日常の判断基準や優先順位が似ていることで、自然体で過ごせる関係が築けます。\n\n${highLabels[2]}に対する意識も高いあなたは、この領域でも共感し合える相手だと、より深い理解と信頼が生まれるはずです。${
        profile.futurePlan ? `\n\n将来の設計として「${profile.futurePlan}」を考えているあなたには、同じ方向を向いて一緒に歩んでいけるパートナーが合います。将来像を共有できるかどうかは、長期的な関係の満足度を大きく左右します。` : ""
      }${
        profile.friendCount ? `\n\n友人との付き合い方が「${profile.friendCount}」というあなたは、パートナーにも似た対人スタイルを持つ人だと、社交面でのストレスが少なくなるでしょう。` : ""
      }\n\n一方で、${lowLabels[0]}や${lowLabels[1]}の領域では、あなたとは異なるこだわりを持つ相手が、新しい視点や気づきをもたらしてくれることもあります。すべてが同じである必要はなく、違いを楽しめる余裕が、豊かなパートナーシップにつながります。`,
    },
    compatibilityAnalysis: buildCompatibilityAnalysis(scores, highLabels, lowLabels, profile),
    compatibilityNarrative: {
      title: "あなたにとっての理想的な人間関係",
      text: `あなたの価値観パターンから見えてくる、理想的な人間関係像についてお話しします。\n\n${
        highLabels[0]}と${highLabels[1]}へのこだわりが強いあなたにとって、恋愛では「${highLabels[0]}の価値観を自然に共有できる相手」との出会いが最も心が安らぐ関係につながりやすいでしょう。一方で、結婚を考えた場合は、日常生活の中で${
        (scores["money"] || 0) >= 35 ? "経済感覚のすり合わせ" : "生活リズムの調和"
      }が長続きの鍵になります。\n\n仕事やビジネスの場面では、${
        (scores["career"] || 0) >= 40 ? "あなたと同じようにキャリアに情熱を持ち、目標に向かって一緒に走れる相手" : "あなたの得意分野を補い、落ち着いた判断を支えてくれる相手"
      }との相性が良いでしょう。友人関係では、${
        (scores["leisure"] || 0) >= 35 ? "一緒に趣味を楽しみながら、時に深い話もできる気の合う仲間" : "穏やかに時間を共有し、互いの空間を尊重できる存在"
      }が心地よいはずです。\n\nクライアントとしては、${
        (scores["communication"] || 0) >= 35 ? "しっかりと対話を重ねながらプロジェクトを進められるタイプ" : "簡潔で要点を押さえたやりとりを好むタイプ"
      }とスムーズな関係が築けるでしょう。\n\nどの関係においても共通しているのは、あなたが大切にしている「${highLabels.join("」「")}」の価値観を理解してくれる相手との間に、最も深い信頼と安心感が生まれるということです。`,
    },
    encounterHints: buildEncounterHints(profile, scores, highCategories, highLabels),
    moneyAnalysis: {
      title: "お金観・経済感覚の深層分析",
      text: `お金観・経済感覚のスコアは${scores["money"] || 0}点（50点満点）です。\n\n${
        (scores["money"] || 0) >= 40
          ? "あなたはお金に対して非常に明確な価値観と方針を持っています。日々の支出を把握し、将来の経済的安定に向けて計画的に行動できるタイプです。"
          : (scores["money"] || 0) >= 30
          ? "あなたはお金に対してバランスの取れた感覚を持っています。必要な場面では慎重に判断しつつも、楽しみへの投資も大切にしています。"
          : "あなたはお金に対して比較的おおらかな姿勢で向き合っている傾向があります。今を楽しむことや体験に価値を置くタイプかもしれません。"
      }${
        profile.financialHabit ? `\n\nあなたのお金の使い方の特徴として「${profile.financialHabit}」が挙げられます。${
          profile.financialHabit.includes("投資") ? "資産運用への意識が高く、将来を見据えた行動ができている点は大きな強みです。" :
          profile.financialHabit.includes("貯金") ? "堅実な貯蓄習慣は、パートナーとの生活においても大きな安心材料になります。" :
          profile.financialHabit.includes("趣味") || profile.financialHabit.includes("思い出") ? "体験や楽しみへの投資を大切にする姿勢は、人生の豊かさにつながります。パートナーとの共通の楽しみにも自然とお金を使えるタイプでしょう。" :
          "パートナーとの間でお金の使い方を共有しておくと、より安心感のある関係が築けます。"
        }` : ""
      }\n\nパートナーとの経済感覚のすり合わせでは、${
        (scores["money"] || 0) >= 35
          ? "あなたの方から率先してお金の話題をオープンにできるはずです。二人なりのルールを早めに決めましょう。"
          : "まずは大きな方向性（貯蓄目標・生活費の分担）を話し合うことから始めてみてください。"
      }`,
    },
    loveAndMarriageAnalysis: {
      title: "恋愛傾向・結婚観・自己防衛パターン",
      text: `あなたの全体的なスコアパターンから、恋愛や結婚に対する傾向を読み取ることができます。\n\n${
        (scores["family"] || 0) >= 35
          ? "家庭観のスコアが高いあなたは、恋愛の先に結婚や家庭を意識している傾向があります。パートナーとの安定した関係性を求め、将来を一緒に描ける相手を求めているようです。"
          : "恋愛に対しては、今の関係性を大切にしながらも、自分自身の成長や充実も同様に重視している傾向があります。"
      }\n\n${
        (scores["communication"] || 0) >= 35
          ? "コミュニケーション力が高いあなたは、パートナーとの対話を通じて関係を深めていくタイプです。気持ちを言葉にして伝え、相手の話にも真摯に耳を傾けることができます。ケンカや意見の不一致があっても、話し合いで解決しようとする建設的な姿勢を持っています。"
          : "コミュニケーションにおいては、言葉よりも態度や行動で気持ちを示すタイプかもしれません。時には意識的に気持ちを言葉にすることで、パートナーとの理解がさらに深まるでしょう。"
      }\n\n${
        (scores["selfcare"] || 0) >= 35
          ? "セルフケア意識の高いあなたは、恋愛においても自分を見失わず、健全な距離感を保てる傾向があります。これは長く続く関係の土台として非常に大切な資質です。"
          : ""
      }${
        profile.futurePlan ? `\n\n将来の設計として「${profile.futurePlan}」を考えているあなたは、${
          profile.futurePlan.includes("結婚") ? "結婚への前向きな姿勢がパートナー探しの大きな原動力になっています。" :
          profile.futurePlan.includes("子ども") ? "子育てのビジョンを共有できるパートナーとの出会いが重要です。" :
          profile.futurePlan.includes("FIRE") || profile.futurePlan.includes("独立") ? "経済的自由や独立への志向がある分、パートナーにも理解と共感を求めるでしょう。" :
          "この方向性をパートナーと共有できるかが、長期的な幸福度を左右します。"
        }` : ""
      }恋愛や結婚における自己防衛パターンとしては、${
        (scores["money"] || 0) >= 35
          ? "経済的な安定を確認してから関係を深めたいという慎重さ"
          : "感情を優先して動きやすい傾向"
      }が見られます。自分のパターンを知っておくことで、より自分らしい恋愛ができるようになるでしょう。`,
    },
    regionalCompatibility: buildRegionalCompatibility(scores, highLabels, profile),
    fourPillarsInsight: buildFourPillarsSection(profile, scores, highCategories),
    partnerCheckGuide: {
      title: "相性比較ページの使い方",
      text: `パートナー候補にもこの診断を受けてもらい、相性比較ページでお互いの結果URLを入力すると、以下の分析ができます。\n\n【AI相性分析レポート】\nAIが2人の100問の回答・プロフィールをすべて読み込み、総合的な相性レポートを作成します。恋愛・結婚・仕事それぞれの相性アドバイスが得られます。\n\n【100問の質問レベル比較】\nカテゴリの合計スコアだけでなく、個別の質問ごとに「どこが一致していて、どこがズレているか」が具体的にわかります。スコアが近くても特定の質問で真逆の回答がある場合、そこが二人にとって重要な話し合いポイントです。\n\n【プロフィール比較】\n趣味・性格タイプ・食の好み・移動手段など、生活スタイルの一致度がひと目でわかります。\n\n【使い方】\n1. 相手にこの診断を受けてもらう\n2. お互いの結果ページのURLを共有\n3. 相性比較ページに2つのURLを入力\n4. 分析結果を見ながら、お互いの価値観について話し合う\n\n点数そのものより、「なぜそう答えたか」を語り合うことが相互理解の第一歩です。`,
    },
    counselorMessage: {
      title: "最後にカウンセラーからのメッセージ",
      text: `この診断を最後まで受けてくださり、ありがとうございます。100問すべてに向き合ったこと自体が、自分自身を理解しようとする素敵な一歩です。\n\n${
        profile.occupation ? `${profile.occupation}として日々を過ごしながら、` : ""
      }${profile.ageRange ? `${profile.ageRange}という時期に` : ""}この診断に取り組んだあなたの結果を見て、印象的なことがあります。\n\nあなたのスコアパターンを見ると、${highLabels[0]}（${scores[highCategories[0]]}点）と${highLabels[1]}（${scores[highCategories[1]]}点）が特に高く、この組み合わせは「${
        highLabels[0]}の価値観を${highLabels[1]}の視点から実現しようとする」独自の強みを示しています。${
        highCategories.length >= 3 ? `さらに${highLabels[2]}（${scores[highCategories[2]]}点）も高い水準にあり、多角的な視点で物事を捉えられる方だと感じます。` : ""
      }\n\n一方で、${lowLabels[0]}（${scores[lowCategories[0]]}点）や${lowLabels[1]}（${scores[lowCategories[1]]}点）の領域はスコアが控えめですが、これは弱みではなくおおらかさの表れです。パートナーとの関係では、ここを相手に任せられる柔軟さとして活きるでしょう。\n\n「${mainType}」というあなたのタイプは、${
        (scores["money"] || 0) >= 35 ? "経済面での明確な方針と" : ""
      }${
        (scores["communication"] || 0) >= 35 ? "対話を通じた深い信頼構築を" : ""
      }${
        (scores["family"] || 0) >= 35 ? "温かい家庭への強い希望を" : ""
      }大切にする方に多く見られます。\n\nパートナー探しにおいて最も大切なのは「自分を知っていること」。この診断で価値観を言語化できたあなたは、すでにその準備ができています。焦る必要はありません。あなたのペースで、あなたらしい出会いを見つけてください。\n\n素敵な未来を心から応援しています。`,
    },
  };
}

/**
 * 四柱推命セクション生成（生年月日がある場合は実計算、なければスコアベース）
 */
/**
 * 各関係タイプの相性ナラティブ分析を生成
 */
function buildCompatibilityAnalysis(
  scores: CategoryScores,
  highLabels: string[],
  lowLabels: string[],
  profile: Record<string, string>
): ReportJson["compatibilityAnalysis"] {
  const money = scores["money"] || 0;
  const family = scores["family"] || 0;
  const comm = scores["communication"] || 0;
  const career = scores["career"] || 0;
  const food = scores["food"] || 0;
  const leisure = scores["leisure"] || 0;
  const growth = scores["growth"] || 0;
  const curiosity = scores["curiosity"] || 0;
  const selfcare = scores["selfcare"] || 0;
  const society = scores["society"] || 0;
  const age = profile.ageRange || "";

  return {
    romance: {
      title: "恋愛で相性の良い人",
      text: `あなたが恋愛で心地よいと感じる相手は、${highLabels[0]}と${highLabels[1]}の感覚が近い人です。日々の会話の中で「そうそう、わかる」と自然に共感し合える関係が、あなたにとっての理想です。\n\n${
        comm >= 35
          ? "コミュニケーションへのこだわりが強いあなたは、気持ちを言葉にしてくれる相手に安心感を覚えます。LINEの返事が素っ気ない人や、本音を言わないタイプだと、不安になりやすいかもしれません。"
          : "言葉での表現よりも、態度や行動で愛情を示すタイプのあなたは、同じように「察する」文化を持つ相手とテンポが合いやすいでしょう。"
      }\n\n${
        money >= 35
          ? "経済感覚へのこだわりが強いので、デートや旅行でのお金の使い方が極端に違う相手だと、早い段階でストレスを感じます。割り勘の感覚が近い人かどうかは、意外と大事なポイントです。"
          : "お金の使い方は柔軟なあなたなので、相手が多少違う金銭感覚でも受け入れやすいでしょう。ただし、結婚を考える段階では価値観の確認を。"
      }\n\n【期待しすぎない方がいい部分】\n${lowLabels[0]}の領域は、あなた自身のこだわりが弱い分、相手にも期待しすぎないことが大切です。ここが相手の強みであれば、それは「任せられる部分」として素直に頼りましょう。\n\n${
        age.includes("20") ? "20代のうちは「完璧な相手」を求めすぎないことも大切です。一緒に成長していける関係の方が、長い目で見て幸せになれます。" : ""
      }`,
    },
    marriage: {
      title: "結婚で相性の良い人",
      text: `結婚相手として考えた場合、恋愛とは求めるものが変わってきます。恋愛では気持ちの盛り上がりが大切ですが、結婚では「日常の快適さ」が鍵になります。\n\n${
        family >= 35
          ? "家庭観へのこだわりが強いあなたは、家族との時間を大切にし、安定した家庭を築きたいという明確なビジョンを持っています。相手にも同じような家庭像を描いてほしいと感じるでしょう。子育てや親との関係性についても、早い段階で話し合えると安心です。"
          : "家庭に対しては比較的柔軟な姿勢のあなたは、相手の家庭観に合わせやすい反面、自分の希望を言語化しておかないと、流されやすくなるリスクもあります。"
      }\n\n${
        money >= 35
          ? "経済感覚のすり合わせは結婚生活の最重要ポイントです。貯蓄・投資・日常の出費について、具体的な数字で話し合える相手が理想です。「お金の話はタブー」という価値観の人とは、長期的に摩擦が生じやすいでしょう。"
          : "お金に対しておおらかなあなたは、パートナーが家計管理を得意としてくれると、うまく補い合える関係になれます。相手に任せっきりにせず、定期的に家計の状況を共有することが長続きのコツです。"
      }\n\n${
        food >= 35
          ? `食へのこだわりが強いあなたにとって、食卓は夫婦のコミュニケーションの場そのものです。${profile.foodPreference ? `「${profile.foodPreference}」という食の傾向を共有できる相手だと、日常の幸福感が格段に高まります。` : "食の好みが合う相手とは、日常の幸福感が格段に高まります。"}`
          : profile.foodPreference ? `食の傾向として「${profile.foodPreference}」を挙げているあなた。食事の場面は二人の距離を縮める大切な時間です。` : ""
      }【任せた方がいい部分】\n${lowLabels.join("や")}の領域は、パートナーが得意であれば積極的に頼りましょう。すべてを自分が担う必要はありません。`,
    },
    business: {
      title: "仕事・ビジネスで相性の良い人",
      text: `ビジネスの場面では、価値観の一致よりも「補い合い」がうまくいく鍵です。\n\n${
        career >= 40
          ? "キャリア志向が非常に高いあなたは、同じくらい仕事に熱意を持つ相手と組むことで最大のパフォーマンスを発揮できます。お互いの目標を理解し、時間とエネルギーの使い方に納得し合える関係が理想です。"
          : "仕事に対してはバランスを重視するあなたは、着実に成果を積み上げるタイプとの相性が良いでしょう。"
      }\n\n${
        comm >= 35
          ? "コミュニケーション力の高いあなたは、クライアント対応やチーム調整で力を発揮します。逆に、データ分析や戦略立案が得意な「裏方タイプ」と組むと強力なコンビになれます。"
          : "実務寄りの仕事ぶりのあなたは、対外的なコミュニケーションが得意な人と組むことで、お互いの強みを活かせます。"
      }\n\n${
        growth >= 35
          ? "成長志向の高いあなたは、「現状維持でOK」というタイプとは長期的にフラストレーションが溜まりやすいです。一緒にスキルアップを目指せるパートナーを選びましょう。"
          : ""
      }${
        money >= 35
          ? "お金への意識が高いので、ビジネスにおいてもコスト意識を共有できる相手とスムーズに連携できます。予算感覚が合わない相手との仕事は、ストレスの元になりやすいです。"
          : ""
      }`,
    },
    friendship: {
      title: "友人として相性の良い人",
      text: `友人関係では、利害関係がない分、純粋に価値観の近さが心地よさに直結します。\n\n${
        profile.friendCount ? `あなたの友人との付き合い方は「${profile.friendCount}」。${
          profile.friendCount.includes("毎日") || profile.friendCount.includes("週に") ? "頻繁に人と会うタイプのあなたは、同じくらい社交的な友人と波長が合います。" :
          profile.friendCount.includes("地元") || profile.friendCount.includes("学生時代") ? "長い付き合いを大切にするあなたは、信頼関係をじっくり育てるタイプです。" :
          profile.friendCount.includes("少数") || profile.friendCount.includes("一人") ? "少数精鋭の関係を好むあなたは、深い対話ができる友人との時間が何より価値があります。" :
          "この付き合い方のスタイルは、パートナーとの社交バランスにも影響します。"
        }\n\n` : ""
      }${
        leisure >= 35
          ? "趣味やレジャーへのこだわりが強いあなたは、「一緒に遊べる」友人の存在が心の安定につながります。共通の趣味を持つ友人とは自然と会う回数も増え、深い関係に発展しやすいでしょう。"
          : "趣味への強いこだわりがない分、多様な友人と幅広く付き合えるのがあなたの強みです。"
      }\n\n${
        society >= 35
          ? "社会意識の高いあなたは、ボランティアや社会活動を通じて出会った友人と、深い価値観の共有ができるタイプです。"
          : ""
      }${
        curiosity >= 35
          ? "好奇心旺盛なあなたは、新しい体験に一緒にチャレンジできる友人と相性抜群です。"
          : "安定を好むあなたは、長い付き合いの中で互いをよく知り、無理なく会える距離感の友人との関係が居心地よいでしょう。"
      }\n\n【注意すべき点】\n${highLabels[0]}へのこだわりが強い分、そこが合わない友人に対して無意識に距離を取ってしまうことがあるかもしれません。違う価値観を持つ友人からの学びも大切にしてみてください。`,
    },
    client: {
      title: "クライアント・取引先との相性",
      text: `仕事上のクライアントや取引先との関係では、あなたの強みを活かせる相手を見極めることが重要です。\n\n${
        comm >= 35
          ? "コミュニケーション力の高いあなたは、密なやりとりを好むクライアントとの相性が抜群です。要件のヒアリングや提案プレゼンで力を発揮し、信頼関係を築きやすいでしょう。逆に、「メールだけで済ませたい」タイプのクライアントとは、少しペースを合わせる工夫が必要です。"
          : "効率的なやりとりを好むあなたは、論理的で要件が明確なクライアントとスムーズに仕事を進められます。長い打ち合わせよりも、文書ベースで確認し合える関係がストレスなく進みます。"
      }\n\n${
        money >= 35
          ? "コスト意識の高いあなたは、予算管理がしっかりしたクライアントと安心して仕事ができます。「いくらでもいいから良いものを」というタイプよりも、明確な予算の中で最善を探る仕事のほうがやりがいを感じるかもしれません。"
          : ""
      }${
        selfcare >= 35
          ? "セルフケア意識の高いあなたは、無理な納期や深夜対応を当然とするクライアントとの相性は良くありません。あなたの仕事の質を保つためにも、適切な距離感を持てる相手を選びましょう。"
          : ""
      }\n\n【期待してはいけない部分】\nクライアントに対して、${lowLabels[0]}の価値観を求めるのは避けましょう。ビジネスの関係では、あなたが得意な領域で価値を提供し、それ以外は相手のやり方を尊重することが、長い関係を築く秘訣です。`,
    },
  };
}

/**
 * 出会いのヒント生成（年代×職業×地域×スコアで個別化）
 */
function buildEncounterHints(
  profile: Record<string, string>,
  scores: CategoryScores,
  highCategories: string[],
  highLabels: string[],
): { title: string; text: string } {
  const age = profile.ageRange || "";
  const occupation = profile.occupation || "";
  const gender = profile.gender || "";
  const familyStructure = profile.familyStructure || "";
  const meetingHistory = profile.meetingHistory || "";
  const partnerMeetingWay = profile.partnerMeetingWay || "";

  const currentYear = new Date().getFullYear();
  const isMarried = familyStructure.includes("既婚") || familyStructure.includes("パートナーと同棲");
  const lines: string[] = [];

  // === 既婚者向け：ビジネス・友人・人脈の出会いヒント ===
  if (isMarried) {
    lines.push(`あなたの価値観パターン（${highLabels.join("・")}重視）を踏まえた、ビジネス・友人・人脈づくりのヒントをお伝えします。`);

    if (partnerMeetingWay) {
      lines.push(`\nパートナーとの出会いが「${partnerMeetingWay}」だったあなたは、人との縁をつくる力をすでにお持ちです。その経験をビジネスや友人関係にも活かしていきましょう。`);
    }

    lines.push("\n【ビジネスパートナー・仕事の人脈づくり】");
    if ((scores["career"] || 0) >= 40) {
      lines.push("キャリア志向が非常に高いあなたには、業界の勉強会や専門カンファレンス（オンライン含む）が最も効率的です。同じ専門性を持つ人との出会いは、仕事の質を大きく向上させます。");
    }
    if (occupation) {
      lines.push(`${occupation}として培った専門知識を活かし、SNS（X・LinkedIn）で情報発信することで、同業種・異業種の人脈が自然と広がります。`);
    }
    lines.push("ビジネスマッチングアプリ（Yenta等）は、仕事の人脈づくりに特化しており効率的です。ランチや30分のオンラインミーティングから気軽に始められます。");

    lines.push("\n【友人・仲間づくり】");
    if ((scores["leisure"] || 0) >= 35) {
      lines.push("趣味への関心が高いあなたは、同じ趣味のコミュニティやサークルに参加するのが自然です。定期的に参加することで、徐々に信頼関係が育ちます。");
    }
    if ((scores["food"] || 0) >= 35) {
      lines.push("食への関心が高いあなたは、行きつけのお店での常連同士のつながりが良いきっかけに。グルメ仲間は長く続く友人関係になりやすいです。");
    }
    lines.push("家庭を持つ方同士のつながり（子どもの学校・地域活動・PTA等）も、価値観の近い友人と出会う良い機会です。");

    lines.push("\n【既婚者だからこそ大切にしたいこと】");
    lines.push("・パートナーとの関係を充実させることが、外の人間関係を豊かにする土台です");
    lines.push("・「夫婦で参加できる場」を1つ見つけると、互いの世界が広がります");
    lines.push("・新しい人間関係は、パートナーにオープンに共有できるものを選びましょう");

  // === 未婚者向け：恋愛・パートナー探しの出会いヒント ===
  } else {
    lines.push(`あなたの価値観パターン（${highLabels.join("・")}重視）と、プロフィールを踏まえた出会いのヒントをお伝えします。`);

    // 過去の出会い経験に基づいた分岐
    const hasAppExperience = meetingHistory.includes("マッチングアプリ");
    const hasNoExperience = meetingHistory.includes("出会いの経験がほとんどない");

    lines.push("\n【最もおすすめ：マッチングアプリの活用】");

    if (hasAppExperience) {
      // すでにマッチングアプリ経験者 → 「新しい方法を試す」視点
      lines.push("マッチングアプリの経験があるあなたには、これまでとは違うアプローチを提案します。");
      lines.push("・使っていたアプリとは違うタイプのアプリを試してみる（真剣度の違うものを並行利用）");
      lines.push("・プロフィール写真と自己紹介文を一新する。以前と同じ内容では同じ層にしかリーチしません");
      lines.push("・メッセージの送り方を変えてみる。相手のプロフィールの具体的な部分に触れると返信率が大きく変わります");
      lines.push("・アプリ以外の出会い方も並行することで、異なる質の出会いが生まれます");
    } else if (hasNoExperience) {
      // 出会いの経験がほとんどない
      lines.push("出会いの経験がまだ少ないあなたは、まず「安心して始められる方法」からがおすすめ。");
      lines.push("・マッチングアプリは自分のペースで進められるので、最初の一歩として最適。まず1つダウンロードしてプロフィールを作成してみましょう");
      lines.push("・写真は友人に撮ってもらった自然な笑顔を。プロフィール文には「大切にしていること」と「休日の過ごし方」を書くだけで十分です");
      lines.push("・最初から完璧を目指す必要はありません。何人かとメッセージをやり取りする経験を積むことが大切です");
    } else {
      // 一般的なアドバイス（年代×性別）
      if (age.includes("10代") || age.includes("20代前半")) {
        lines.push("10代〜20代前半のあなたは、SNS（Instagram、X、TikTok）やバイト先、学校での自然な出会いが多い時期。マッチングアプリを使う場合はカジュアルなものから始めるのがおすすめです。");
      } else if (age.includes("40代") || age.includes("50代")) {
        lines.push("マッチングアプリは40代以上でも十分に有効です。「これまでの経験で大切にしてきたこと」「これからの人生で一緒に楽しみたいこと」を具体的にプロフィールに書くと、価値観の合う方からのアプローチが増えます。複数のアプリを並行利用し、写真は趣味を楽しんでいる自然な姿を。");
      } else {
        lines.push("マッチングアプリは現在最も効率的な出会い手段です。母数が数百万人で価値観の合う相手を探せます。複数のアプリを並行利用し、プロフィール写真は清潔感のある自然な笑顔を。自己紹介文には「大切にしている価値観」と「休日の過ごし方」を具体的に書きましょう。");
      }
    }

    // 過去の出会い経験を活かす提案
    if (meetingHistory && !hasNoExperience) {
      const methods = meetingHistory.split("、");
      const newMethods: string[] = [];
      if (!methods.includes("友人・知人の紹介")) newMethods.push("友人・知人の紹介（信頼度が高い）");
      if (!methods.includes("職場・仕事関係") && !occupation?.includes("学生")) newMethods.push("職場・取引先の人間関係からの発展");
      if (!methods.includes("SNS・オンライン")) newMethods.push("SNSでの価値観発信からの出会い");

      if (newMethods.length > 0) {
        lines.push("\n【まだ試していない出会い方】");
        lines.push(`あなたの経験にない出会い方として、${newMethods.join("、")}がおすすめです。同じ方法を繰り返すより、新しいチャネルを開拓することで出会いの質が変わります。`);
      }
    }

    // === 既存の人間関係 ===
    lines.push("\n【既存の人間関係を活かす】");
    if (occupation?.includes("学生")) {
      lines.push("学生のあなたは、サークル・ゼミ・バイト先が最も自然な出会いの場。友人の紹介も有力です。");
    } else if (occupation) {
      lines.push(`${occupation}として働くあなたの職場や取引先には出会いの可能性があります。仕事を通じて人柄が見えるため、質の高い出会いが期待できます。`);
    }

    // === 今日から実践できること ===
    lines.push("\n【今日から実践できること】");
    if (hasAppExperience) {
      lines.push("・プロフィールを完全に書き直してみましょう。新しい写真・新しい自己紹介文で新鮮なスタートを");
    } else {
      lines.push("・マッチングアプリをまだ使っていないなら、まず1つダウンロードしてプロフィールを作成してみましょう");
    }
    if ((scores["communication"] || 0) >= 35) {
      lines.push("・対話力が高いあなたは、SNSで自分の考えを発信すると共感する人とつながりやすくなります");
    }
  }

  lines.push("\n※ 異業種交流会・セミナー形式のイベントは母数が少なく勧誘リスクもあるため非推奨です。");
  lines.push("※ 資産形成セミナー・FP講座・投資サークルは詐欺リスクが高いためおすすめしません。");

  return {
    title: isMarried
      ? `${currentYear}年、あなたに合った人脈づくりのヒント`
      : `${currentYear}年、あなたに合った出会いのヒント`,
    text: lines.join("\n"),
  };
}

/** 都道府県の県民性とスコアの関連を分析 */
function getPrefecturePersonality(pref: string, scores: CategoryScores): string {
  const money = scores["money"] || 0;
  const comm = scores["communication"] || 0;
  const family = scores["family"] || 0;

  // 地方ブロック判定
  const kanto = ["東京都", "神奈川県", "千葉県", "埼玉県", "茨城県", "栃木県", "群馬県"];
  const kansai = ["大阪府", "京都府", "兵庫県", "奈良県", "三重県", "滋賀県", "和歌山県"];
  const tokai = ["愛知県", "岐阜県", "静岡県"];
  const kyushu = ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];
  const tohoku = ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"];

  if (kanto.includes(pref)) {
    return `${pref}は多様な価値観が共存する地域です。${comm >= 35 ? "コミュニケーション力の高いあなたは、この多様性の中で自分らしさを発揮できるタイプ。" : ""}効率性や合理性を重視する傾向があり、パートナーにも自立した関係を求めやすいでしょう。`;
  } else if (kansai.includes(pref)) {
    return `${pref}は人情味があり、会話を大切にする文化が根付いています。${money >= 35 ? "お金に対する堅実さは関西の「始末」の精神と通じるものがあります。" : ""}本音で話し合える関係を自然に築けるのがあなたの強みです。`;
  } else if (tokai.includes(pref)) {
    return `${pref}は堅実で勤勉な気質が特徴です。${money >= 35 ? "貯蓄意識の高さは東海地方の気質そのもの。経済感覚が合うパートナーを見つけやすいでしょう。" : ""}真面目で計画的な一面が、長期的なパートナーシップに向いています。`;
  } else if (kyushu.includes(pref)) {
    return `${pref}は温かい人柄と家族の絆を大切にする文化があります。${family >= 35 ? "家庭を重視するあなたの価値観は、この地域の気質と深く共鳴しています。" : ""}おおらかさと芯の強さを兼ね備えた方が多い地域です。`;
  } else if (tohoku.includes(pref)) {
    return `${pref}は忍耐強く誠実な気質が特徴です。口数は少なくても行動で示すタイプが多く、信頼関係を時間をかけて築く文化があります。${family >= 35 ? "家族を大切にする価値観は東北の気質と相性が良いです。" : ""}`;
  } else if (pref === "北海道") {
    return "北海道は開拓者精神とおおらかさが特徴です。新しいことに挑戦する気風があり、人と人との距離感もちょうど良い地域です。自由な発想と温かい人柄を兼ね備えた方が多いでしょう。";
  } else {
    return `${pref}で育った経験は、あなたの価値観の土台になっています。地元の文化や人間関係のスタイルが「自然な基準」として身についており、パートナー選びにも影響しています。`;
  }
}

function buildRegionalCompatibility(
  scores: CategoryScores,
  highLabels: string[],
  profile: Record<string, string>,
): { title: string; text: string } {
  const money = scores["money"] || 0;
  const family = scores["family"] || 0;
  const comm = scores["communication"] || 0;
  const career = scores["career"] || 0;
  const food = scores["food"] || 0;
  const leisure = scores["leisure"] || 0;
  const curiosity = scores["curiosity"] || 0;

  const birthPlace = profile.birthPlace || "";
  const currentResidence = profile.currentResidence || "";
  const isUrban = ["東京都", "大阪府", "神奈川県", "愛知県", "福岡県", "京都府", "兵庫県", "埼玉県", "千葉県"].some(p => birthPlace.includes(p) || currentResidence.includes(p));
  const isRural = birthPlace && !isUrban && birthPlace !== "海外";

  const lines: string[] = [];

  // 出身地の県民性分析（具体的に）
  if (birthPlace && birthPlace !== "海外") {
    lines.push(`【${birthPlace}出身のあなたの傾向】`);
    lines.push(getPrefecturePersonality(birthPlace, scores));
  }

  // 都会×田舎 の相性分析
  lines.push("\n【暮らし方から見た相性】");
  if (isRural && (leisure >= 35 || food >= 35)) {
    lines.push("自然が身近な環境で育ったあなたは、趣味や食へのこだわりも地に足がついています。同じように田舎暮らしの経験がある方とは、生活リズムや価値観が合いやすいでしょう。都会育ちの方の場合は、自然体験への関心がある方が相性が良いです。");
  } else if (isUrban && curiosity >= 35) {
    lines.push("都会で多様な刺激に触れてきたあなたは、新しいもの好きで行動力がある傾向があります。ただし結婚を考えるなら、実家が地方にある方だと「帰省先が自然の中」というメリットがあり、オンオフの切り替えがしやすくなります。");
  } else if (isUrban) {
    lines.push("都会での暮らしが長いあなたは、利便性や効率性を重視する傾向があります。同じ都市圏の方とは生活スタイルが合いやすいですが、地方出身の方の堅実さや温かさに惹かれることもあるでしょう。");
  } else if (isRural) {
    lines.push("地方で育った堅実さと温かさがあなたの強みです。同じ地域の方とは価値観が近くて安心感がありますが、都会の方のフットワークの軽さから学ぶこともあるでしょう。");
  }

  // 現在の住まいと出身の違い
  if (birthPlace && currentResidence && birthPlace !== currentResidence) {
    lines.push(`\n${birthPlace}出身で現在${currentResidence}にお住まいのあなたは、異なる地域文化を経験しています。この適応力はパートナー選びでも強みになります。地元が近い方とは安心感があり、現在の住まいが同じ方とは生活圏を共有しやすいです。`);
  }

  // スコアパターンに基づく相性の良い地域特性
  lines.push("\n【価値観から見た相性の良い地域特性】");
  if (money >= 35 && family >= 35) {
    lines.push("堅実な金銭感覚と家庭を大切にする価値観のあなたには、同じく「貯蓄意識が高く家族を重視する」地域の方が合います。東海地方（愛知・岐阜・三重）や北陸地方（富山・石川・福井）の方にはこの傾向が強いです。");
  } else if (comm >= 35 && food >= 35) {
    lines.push("会話と食を大切にするあなたには、食文化が豊かで人付き合いが活発な地域の方が合います。関西圏（大阪・京都・兵庫）や九州（福岡・熊本・長崎）の方との相性が良い傾向があります。");
  } else if (career >= 40) {
    lines.push("キャリア志向が非常に高いあなたには、仕事への情熱を理解してくれる都市部の方が合いやすいです。ただし、癒しの時間も大切ですので、自然が好きで穏やかな方がバランスの良いパートナーになることもあります。");
  } else {
    lines.push("バランスの取れた価値観のあなたは、特定の地域に限定されず幅広い方と相性が良いです。大切なのは地域よりも、生活リズムや将来住みたい場所のイメージが近いかどうかです。");
  }

  lines.push("\n※ 県民性はあくまで傾向で個人差が大きいです。相手個人の価値観を知ることが最も大切です。");

  return {
    title: "地域特性から見るパートナー相性",
    text: lines.join("\n"),
  };
}

function buildFourPillarsSection(
  profile: Record<string, string>,
  scores: CategoryScores,
  highCategories: string[],
): { title: string; text: string } {
  const birthDate = profile.birthDate || "";
  const pillars = calculateFourPillars(birthDate);

  if (pillars) {
    // 生年月日から実際に四柱推命を計算
    const balanceText = Object.entries(pillars.elementBalance)
      .map(([el, count]) => `${el}:${count}`)
      .join("　");

    const integrated = buildIntegratedInsight(pillars, scores, highCategories);

    return {
      title: "四柱推命から見るあなたの本質",
      text: `あなたの生年月日（${birthDate}）から四柱推命の命式を算出しました。\n\n【命式】\n年柱：${pillars.yearStem.name}${pillars.yearBranch.name}（${pillars.yearStem.reading}の${pillars.yearBranch.animal}）\n月柱：${pillars.monthStem.name}${pillars.monthBranch.name}（${pillars.monthStem.reading}の${pillars.monthBranch.animal}）\n日柱：${pillars.dayStem.name}${pillars.dayBranch.name}（${pillars.dayStem.reading}の${pillars.dayBranch.animal}）\n\n【五行バランス】\n${balanceText}\n\n【あなたの本命：${pillars.mainElement}（${pillars.dayStem.name}）】\n${pillars.personalityInsight}\n\n【恋愛・パートナーシップの傾向】\n${pillars.loveInsight}\n\n【価値観との統合分析】${integrated}\n\n【相性の良い五行】\n${pillars.compatibleElements.map(el => `・${el}`).join("\n")}\n\n【成長を促す五行（補い合える関係）】\n${pillars.challengeElements.map(el => `・${el}`).join("\n")}\n\n※ 四柱推命は統計学に基づく参考情報です。最も大切なのは、実際の対話を通じて相手を知ることです。`,
    };
  }

  // 生年月日がない場合はスコアベースで五行を推定
  const elementMap: [string, string, string[]][] = [
    ["木", "成長・発展・仁愛", ["growth", "curiosity"]],
    ["火", "情熱・表現・礼節", ["communication", "society"]],
    ["土", "安定・信頼・誠実", ["family", "selfcare"]],
    ["金", "正義・決断・実行", ["money", "career"]],
    ["水", "知恵・柔軟・感性", ["leisure", "food"]],
  ];

  // スコアから推定五行を計算
  const elementScores = elementMap.map(([el, desc, cats]) => ({
    element: el,
    description: desc,
    score: cats.reduce((sum, c) => sum + (scores[c] || 0), 0),
  })).sort((a, b) => b.score - a.score);

  const dominant = elementScores[0];
  const secondary = elementScores[1];
  const weak = elementScores[elementScores.length - 1];

  return {
    title: "五行バランスから見るあなたの傾向",
    text: `生年月日が未入力のため、100問の回答パターンから五行（木・火・土・金・水）の傾向を推定しました。\n\n【あなたの推定主要五行：${dominant.element}】\n${dominant.description}のエネルギーが最も強く表れています。\n\n副次的に「${secondary.element}」（${secondary.description}）の傾向も持ち合わせています。この組み合わせは、${dominant.element}の力強さに${secondary.element}の深みが加わった独特の個性です。\n\n一方「${weak.element}」（${weak.description}）のエネルギーは控えめです。パートナーがこの要素を持っていると、自然と補い合える関係になるでしょう。\n\n五行の全バランス：\n${elementScores.map(e => `${e.element}（${e.description}）：${"■".repeat(Math.round(e.score / 10))}${"□".repeat(Math.max(0, 10 - Math.round(e.score / 10)))} ${e.score}pt`).join("\n")}\n\n※ より正確な四柱推命は生年月日の入力が必要です。プロフィールで生年月日を入力すると、天干地支や命式に基づいた詳細な鑑定結果が表示されます。`,
  };
}
