/**
 * 四柱推命の計算エンジン
 * 生年月日から天干地支・五行・相性を算出する
 */

// 十干（天干）
const HEAVENLY_STEMS = [
  { name: "甲", reading: "きのえ", element: "木", polarity: "陽", trait: "リーダーシップと決断力に優れ、まっすぐな正義感を持つ" },
  { name: "乙", reading: "きのと", element: "木", polarity: "陰", trait: "柔軟で粘り強く、人との調和を大切にする優しさがある" },
  { name: "丙", reading: "ひのえ", element: "火", polarity: "陽", trait: "明るくエネルギッシュで、周囲を照らす太陽のような存在" },
  { name: "丁", reading: "ひのと", element: "火", polarity: "陰", trait: "繊細な感受性と情熱を内に秘め、深い思慮で人を導く" },
  { name: "戊", reading: "つちのえ", element: "土", polarity: "陽", trait: "包容力があり信頼感が厚く、周囲の安定を支える存在" },
  { name: "己", reading: "つちのと", element: "土", polarity: "陰", trait: "細やかな気配りと献身性で、人を育み守る温かさがある" },
  { name: "庚", reading: "かのえ", element: "金", polarity: "陽", trait: "意志が強く行動力に溢れ、困難を乗り越える強さを持つ" },
  { name: "辛", reading: "かのと", element: "金", polarity: "陰", trait: "感性が鋭く美意識が高く、繊細ながらも芯のある人" },
  { name: "壬", reading: "みずのえ", element: "水", polarity: "陽", trait: "知性と適応力に優れ、大きな流れを読む洞察力がある" },
  { name: "癸", reading: "みずのと", element: "水", polarity: "陰", trait: "直感力と想像力が豊かで、静かに周囲を潤す癒しの存在" },
];

// 十二支（地支）
const EARTHLY_BRANCHES = [
  { name: "子", reading: "ね", animal: "鼠", element: "水", trait: "機敏で社交的、情報収集力に長ける" },
  { name: "丑", reading: "うし", animal: "牛", element: "土", trait: "忍耐強く誠実、着実に物事を進める" },
  { name: "寅", reading: "とら", animal: "虎", element: "木", trait: "行動力と勇気に満ち、リーダー気質" },
  { name: "卯", reading: "う", animal: "兎", element: "木", trait: "穏やかで愛される、人間関係の達人" },
  { name: "辰", reading: "たつ", animal: "龍", element: "土", trait: "カリスマ性があり、大きな夢を追う" },
  { name: "巳", reading: "み", animal: "蛇", element: "火", trait: "知恵深く直感的、洞察力に優れる" },
  { name: "午", reading: "うま", animal: "馬", element: "火", trait: "情熱的で自由を愛し、エネルギッシュ" },
  { name: "未", reading: "ひつじ", animal: "羊", element: "土", trait: "温厚で芸術的センスがあり、協調性が高い" },
  { name: "申", reading: "さる", animal: "猿", element: "金", trait: "知性と好奇心旺盛、器用で機転が利く" },
  { name: "酉", reading: "とり", animal: "鶏", element: "金", trait: "几帳面で観察力があり、完璧主義な面も" },
  { name: "戌", reading: "いぬ", animal: "犬", element: "土", trait: "忠義心が厚く正直、信頼できる守護者" },
  { name: "亥", reading: "い", animal: "猪", element: "水", trait: "純粋で情に厚く、目標に向かって猪突猛進" },
];

// 五行の相生相剋
const ELEMENT_RELATIONS: Record<string, { generates: string; weakens: string; description: string }> = {
  木: { generates: "火", weakens: "土", description: "成長・発展・仁愛を象徴し、春の生命力を宿す" },
  火: { generates: "土", weakens: "金", description: "情熱・表現・礼節を象徴し、夏の輝きを宿す" },
  土: { generates: "金", weakens: "水", description: "安定・信頼・誠実を象徴し、季節の変わり目の包容力を宿す" },
  金: { generates: "水", weakens: "木", description: "正義・決断・義理を象徴し、秋の実りと厳しさを宿す" },
  水: { generates: "木", weakens: "火", description: "知恵・柔軟・智慧を象徴し、冬の静けさと深さを宿す" },
};

// 五行の相性マトリクス
const ELEMENT_COMPATIBILITY: Record<string, Record<string, { score: number; comment: string }>> = {
  木: {
    木: { score: 75, comment: "同じ志を持つ同志。共に成長できるが、意見がぶつかることも" },
    火: { score: 90, comment: "木が火を育てる相生の関係。互いの才能を引き出し合える最良の組み合わせ" },
    土: { score: 55, comment: "木は土の養分を吸収する。支え合いの意識が大切" },
    金: { score: 45, comment: "金は木を切る相剋の関係。しかし適度な緊張感が成長を促す" },
    水: { score: 85, comment: "水が木を育てる相生の関係。自然な形で支え合える心地よさ" },
  },
  火: {
    木: { score: 90, comment: "木が火を育てる関係。相手があなたの情熱を支えてくれる" },
    火: { score: 70, comment: "情熱と情熱のぶつかり合い。刺激的だが、時に消耗することも" },
    土: { score: 85, comment: "火が土を生み出す相生の関係。あなたの行動力が相手の安定を生む" },
    金: { score: 50, comment: "火は金を溶かす相剋の関係。お互いの領域を尊重する心がけが大切" },
    水: { score: 40, comment: "水は火を消す相剋の関係。しかし蒸気を生むように、化学反応が起きることも" },
  },
  土: {
    木: { score: 55, comment: "木に養分を与える関係。献身的になりすぎないバランスが大切" },
    火: { score: 85, comment: "火が土を生む相生の関係。相手の情熱があなたの安定を豊かにする" },
    土: { score: 80, comment: "同じ大地の上に立つ仲間。安心感が強いが、変化を取り入れる工夫を" },
    金: { score: 88, comment: "土が金を生む相生の関係。あなたの包容力が相手の才能を引き出す" },
    水: { score: 50, comment: "土は水をせき止める。お互いの流れを理解する対話が鍵" },
  },
  金: {
    木: { score: 45, comment: "金が木を制する関係。相手を導きたい気持ちが強くなりがち" },
    火: { score: 50, comment: "火に溶かされる関係。相手の情熱に圧倒されることもあるが、新しい形に生まれ変われる" },
    土: { score: 88, comment: "土に育まれる相生の関係。相手の安定感があなたの力を引き出す" },
    金: { score: 72, comment: "同じ金属同士。共鳴し合うが、ぶつかると火花が散ることも" },
    水: { score: 87, comment: "金が水を生む相生の関係。あなたの決断力が相手の知恵を活かす" },
  },
  水: {
    木: { score: 85, comment: "水が木を育てる相生の関係。あなたの知恵が相手の成長を支える" },
    火: { score: 40, comment: "水と火の相剋。正反対だからこそ補い合える可能性も秘めている" },
    土: { score: 50, comment: "土にせき止められる関係。お互いの価値観をすり合わせる時間が大切" },
    金: { score: 87, comment: "金に生み出される相生の関係。相手の強さがあなたの知恵を豊かにする" },
    水: { score: 78, comment: "深い理解で通じ合える。ただし流されやすい面もあるので、芯を持つことが大切" },
  },
};

// 月柱の天干（年干から月干を求める）
function getMonthStem(yearStemIndex: number, month: number): number {
  // 甲己の年は丙寅月から始まる（index 2）
  // 乙庚の年は戊寅月から（index 4）
  // 丙辛の年は庚寅月から（index 6）
  // 丁壬の年は壬寅月から（index 8）
  // 戊癸の年は甲寅月から（index 0）
  const baseStems = [2, 4, 6, 8, 0];
  const base = baseStems[yearStemIndex % 5];
  return (base + (month - 1)) % 10;
}

// 月柱の地支（月は寅月=1月から始まる）
function getMonthBranch(month: number): number {
  // 旧暦1月=寅(2), 2月=卯(3), ... 12月=丑(1)
  return (month + 1) % 12;
}

// 日柱の計算（簡易版：グレゴリオ暦から日干支を算出）
function getDayPillar(year: number, month: number, day: number): { stemIndex: number; branchIndex: number } {
  // 蔡勉式日干支計算の簡易版
  const y = month <= 2 ? year - 1 : year;
  const m = month <= 2 ? month + 12 : month;
  const c = Math.floor(y / 100);
  const yy = y % 100;

  // 日干支番号計算
  const g = (4 * c + Math.floor(c / 4) + 5 * yy + Math.floor(yy / 4) + Math.floor(3 * (m + 1) / 5) + day - 3) % 60;

  return {
    stemIndex: ((g % 10) + 10) % 10,
    branchIndex: ((g % 12) + 12) % 12,
  };
}

export interface FourPillarsResult {
  yearStem: typeof HEAVENLY_STEMS[number];
  yearBranch: typeof EARTHLY_BRANCHES[number];
  monthStem: typeof HEAVENLY_STEMS[number];
  monthBranch: typeof EARTHLY_BRANCHES[number];
  dayStem: typeof HEAVENLY_STEMS[number];
  dayBranch: typeof EARTHLY_BRANCHES[number];
  mainElement: string;
  elementBalance: Record<string, number>;
  personalityInsight: string;
  loveInsight: string;
  compatibleElements: string[];
  challengeElements: string[];
}

/**
 * 生年月日から四柱推命を計算
 */
export function calculateFourPillars(birthDate: string): FourPillarsResult | null {
  // 日付パース（YYYY-MM-DD or YYYY/MM/DD）
  const match = birthDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (!match) return null;

  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);

  if (year < 1920 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  // 年柱
  const yearStemIndex = (year - 4) % 10;
  const yearBranchIndex = (year - 4) % 12;

  // 月柱（旧暦近似：グレゴリオ暦月をそのまま使用）
  const monthStemIndex = getMonthStem(yearStemIndex, month);
  const monthBranchIndex = getMonthBranch(month);

  // 日柱
  const dayPillar = getDayPillar(year, month, day);

  const yearStem = HEAVENLY_STEMS[yearStemIndex];
  const yearBranch = EARTHLY_BRANCHES[yearBranchIndex];
  const monthStem = HEAVENLY_STEMS[monthStemIndex];
  const monthBranch = EARTHLY_BRANCHES[monthBranchIndex];
  const dayStem = HEAVENLY_STEMS[dayPillar.stemIndex];
  const dayBranch = EARTHLY_BRANCHES[dayPillar.branchIndex];

  // 五行バランス計算
  const elements = [
    yearStem.element, yearBranch.element,
    monthStem.element, monthBranch.element,
    dayStem.element, dayBranch.element,
  ];
  const balance: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const e of elements) balance[e]++;

  // 日干が「本命」（自分自身を表す）
  const mainElement = dayStem.element;

  // 五行バランスから性格洞察を生成
  const sorted = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0];
  const weak = sorted[sorted.length - 1];

  // 相性の良い五行
  const rel = ELEMENT_RELATIONS[mainElement];
  const generatedBy = Object.entries(ELEMENT_RELATIONS).find(([, v]) => v.generates === mainElement)?.[0] || "";
  const compatibleElements = [generatedBy, rel.generates].filter(Boolean);
  const challengeElements = [
    rel.weakens,
    Object.entries(ELEMENT_RELATIONS).find(([, v]) => v.weakens === mainElement)?.[0] || "",
  ].filter(Boolean);

  // 個別性のある性格洞察
  const personalityInsight = buildPersonalityInsight(dayStem, dayBranch, yearBranch, balance, dominant, weak);
  const loveInsight = buildLoveInsight(dayStem, dayBranch, mainElement, balance);

  return {
    yearStem, yearBranch,
    monthStem, monthBranch,
    dayStem, dayBranch,
    mainElement,
    elementBalance: balance,
    personalityInsight,
    loveInsight,
    compatibleElements,
    challengeElements,
  };
}

function buildPersonalityInsight(
  dayStem: typeof HEAVENLY_STEMS[number],
  dayBranch: typeof EARTHLY_BRANCHES[number],
  yearBranch: typeof EARTHLY_BRANCHES[number],
  balance: Record<string, number>,
  dominant: [string, number],
  weak: [string, number],
): string {
  const lines: string[] = [];

  lines.push(`あなたの日干は「${dayStem.name}（${dayStem.reading}）」、${dayStem.element}の${dayStem.polarity}です。${dayStem.trait}。`);
  lines.push(`日支の「${dayBranch.name}（${dayBranch.animal}）」は、${dayBranch.trait}傾向を内面に持っていることを示しています。`);
  lines.push(`年支の「${yearBranch.name}（${yearBranch.animal}）」は、社会的な場面で${yearBranch.trait}面が表に出やすいことを意味します。`);

  lines.push(`\n五行のバランスを見ると、「${dominant[0]}」が${dominant[1]}つと最も多く、${ELEMENT_RELATIONS[dominant[0]].description.split("を象徴")[0]}の力が強く働いています。`);

  if (weak[1] === 0) {
    lines.push(`一方で「${weak[0]}」のエネルギーが不足しており、${ELEMENT_RELATIONS[weak[0]].description.split("を象徴")[0]}の要素を意識的に取り入れることで、よりバランスの取れた人生を送れるでしょう。`);
  } else if (weak[1] <= 1) {
    lines.push(`「${weak[0]}」はやや控えめですが、これはあなたの個性の一部です。パートナーがこの要素を補ってくれると、絶妙な調和が生まれます。`);
  }

  return lines.join("");
}

function buildLoveInsight(
  dayStem: typeof HEAVENLY_STEMS[number],
  dayBranch: typeof EARTHLY_BRANCHES[number],
  mainElement: string,
  balance: Record<string, number>,
): string {
  const lines: string[] = [];
  const rel = ELEMENT_RELATIONS[mainElement];

  if (dayStem.polarity === "陽") {
    lines.push(`${dayStem.polarity}の${dayStem.element}を持つあなたは、恋愛においてもリードしたい気持ちが自然に出やすいタイプです。`);
  } else {
    lines.push(`${dayStem.polarity}の${dayStem.element}を持つあなたは、恋愛においても相手を細やかに支え、居心地の良い関係を築くことを好みます。`);
  }

  lines.push(`日支「${dayBranch.name}（${dayBranch.animal}）」から見ると、内面では${dayBranch.trait}パートナーを求めています。`);

  // 相性の良い五行のパートナー
  const generatedBy = Object.entries(ELEMENT_RELATIONS).find(([, v]) => v.generates === mainElement)?.[0];
  if (generatedBy) {
    lines.push(`\n五行の相生関係から、「${generatedBy}」の要素を持つ人があなたを自然に支えてくれます。`);
  }
  lines.push(`あなたが生み出す「${rel.generates}」の要素を持つ人とは、あなたがリードする形で良い関係が築けるでしょう。`);

  if (balance[mainElement] >= 2) {
    lines.push(`自分と同じ「${mainElement}」の要素が強い人とは、深い共感を得られますが、お互いに譲り合いの意識が大切です。`);
  }

  return lines.join("");
}

/**
 * 2人の四柱推命相性を計算
 */
export function calculateFourPillarsCompatibility(
  pillarsA: FourPillarsResult,
  pillarsB: FourPillarsResult,
): { score: number; comment: string } {
  const compat = ELEMENT_COMPATIBILITY[pillarsA.mainElement]?.[pillarsB.mainElement];
  return compat || { score: 65, comment: "独特な組み合わせ。お互いの違いから学び合える関係です。" };
}

/**
 * スコアパターンに基づいて四柱推命と価値観の統合洞察を生成
 */
export function buildIntegratedInsight(
  pillars: FourPillarsResult,
  scores: Record<string, number>,
  highCategories: string[],
): string {
  const lines: string[] = [];
  const mainEl = pillars.mainElement;

  // 五行と価値観スコアの対応関係分析
  const elementCategoryMap: Record<string, string[]> = {
    木: ["growth", "curiosity"],
    火: ["communication", "society"],
    土: ["family", "selfcare"],
    金: ["money", "career"],
    水: ["leisure", "food"],
  };

  const matchingCats = elementCategoryMap[mainEl] || [];
  const matchingScores = matchingCats.map(c => scores[c] || 0);
  const avgMatchScore = matchingScores.length > 0 ? matchingScores.reduce((a, b) => a + b, 0) / matchingScores.length : 25;

  if (avgMatchScore >= 35) {
    lines.push(`\n興味深いことに、あなたの本命「${mainEl}」に対応する価値観カテゴリ（${matchingCats.map(c => {
      const labels: Record<string, string> = { growth: "成長", curiosity: "探究心", communication: "コミュニケーション", society: "社会観", family: "家庭観", selfcare: "セルフケア", money: "お金観", career: "キャリア", leisure: "余暇", food: "食" };
      return labels[c] || c;
    }).join("・")}）のスコアが高く、五行の性質が日常の価値観としても強く表れています。これは自分の本質に忠実に生きている証です。`);
  } else {
    lines.push(`\nあなたの本命は「${mainEl}」ですが、対応する価値観カテゴリのスコアはそこまで高くありません。これは五行のエネルギーがまだ潜在的に眠っている可能性を示しています。これから先、この分野が自然と目覚めていく時期が来るかもしれません。`);
  }

  // 高得点カテゴリと五行の関係
  if (highCategories.length > 0) {
    const highElements = highCategories.map(cat => {
      for (const [el, cats] of Object.entries(elementCategoryMap)) {
        if (cats.includes(cat)) return el;
      }
      return null;
    }).filter(Boolean);

    const uniqueHighElements = [...new Set(highElements)];
    if (uniqueHighElements.length > 0) {
      lines.push(`あなたが特に大切にしている価値観は「${uniqueHighElements.join("・")}」の五行エネルギーと共鳴しています。パートナー選びでは、この五行を持つ相手、または相生関係にある五行の相手が自然な相性を発揮するでしょう。`);
    }
  }

  return lines.join("");
}
