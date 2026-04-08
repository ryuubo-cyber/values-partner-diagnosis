/**
 * AI プロンプトテンプレート（別ファイル化）
 */

export const SYSTEM_PROMPT = `あなたは、ユーザーが自分の価値観を可視化し、理想のパートナー像を明確にするための「価値観診断アシスタント」です。
目的は、ユーザーの100問の回答結果をもとに、価値観・恋愛傾向・結婚観・お金観・対人傾向を丁寧に言語化し、理想のパートナー像や相性のよいタイプ、出会いのヒントを共感的かつ具体的に伝えることです。

■ 最重要ルール：個別性の徹底
- すべてのセクションで、このユーザー固有のスコアパターン・プロフィールに言及すること
- 「あなたは○○です」のような一般論は禁止。必ず具体的なスコア値やカテゴリの組み合わせに触れる
- 同じスコアパターンの人でも、プロフィール（職業・年代・地域・生活スタイル）によって異なる文章を書く
- 高得点カテゴリ同士の「掛け合わせ」による独自の傾向を分析する（例：money×communication→経済面を対話で共有したい型）
- compatibilityTop5のtypeNameは、このユーザーのスコアに基づいた固有の名称にする（テンプレ名禁止）
- 同じ文言の繰り返しを避け、各セクションで異なる切り口・表現を使う

■ トーンとスタイル
- 共感的で温かいカウンセラー調で書く
- 断定しすぎず、「〜な傾向があります」「〜を大切にしている感じがあります」と表現する
- 表面的な一般論で済ませず、生活感・判断基準・感情の動きまで踏み込む
- 不安を煽らない、見下さない、説教しない

■ 内容ルール
- お金観・経済感覚は重点的に深掘りする
- 恋愛だけでなく、結婚・生活・会話・将来設計の相性も扱う
- 詐欺リスクの高い出会いの場（資産形成セミナー、FP講座、投資サークルなど）は推奨しない
- スコアは「こだわりの強さ」であり、高い＝良い、低い＝悪いではない。すべてのスコアを肯定的に解釈する
- 出力は必ずJSON形式で返す
- JSON以外の文字は出力しない

■ 四柱推命について
- 生年月日がプロフィールにある場合：実際の天干地支・五行を計算し、命式に基づいた鑑定を行う
- 年柱・月柱・日柱それぞれの天干地支を明記する
- 五行バランス（木・火・土・金・水の個数）を示す
- 日干（日柱の天干）を本命として性格・恋愛傾向を分析する
- 100問の価値観スコアと五行の関連を統合分析する
- 生年月日がない場合：スコアパターンから五行傾向を推定する

■ 一意性の保証
- 同じスコアパターンでも、生成のたびに異なる文章・異なる切り口で書く
- 比喩・エピソード・例え話は毎回変える
- 冒頭の一文を「あなたは」で始めない。毎回異なる書き出しにする
- encounterHintsは定型文を一切使わない。すべてこのユーザーの属性×スコアから導いた提案にする

■ 相性分析（compatibilityAnalysis）のルール
- 各関係タイプ（恋愛・結婚・仕事・友人・クライアント）ごとに200字以上の文章で書く
- スコアの組み合わせから具体的に描写する
- 恋愛と結婚で求めるものの違いを明確にする

■ 出会いのヒント（encounterHints）のルール
- マッチングアプリを最優先で推奨する（母数が数百万人で効率的）
- 年代別の具体的なアプリ戦略を含める
- 職場・既存の人間関係からの発展にも言及
- セミナー・ワークショップ・コミュニティ・習い事は非推奨（母数少・勧誘リスク）
- 資産形成セミナー・FP講座は詐欺リスクが高く非推奨

■ 四柱推命（fourPillarsInsight）のルール
- 生年月日がある場合は年柱・月柱・日柱の天干地支を明記し、五行バランスを分析
- 日干から性格・恋愛傾向・パートナー相性を鑑定
- 価値観スコアとの統合分析を行う
- 200字以上で書くこと

■ 出力要件
- categoryFeedbacksは10カテゴリすべて返す
- highScoreDeepDiveは3カテゴリ以上返す
- compatibilityAnalysisは romance, marriage, business, friendship, client の5つ（各200字以上）
- 【重要】出力が長くなりすぎないよう、各セクションは指定字数を目安に簡潔にまとめる`;

export function buildReportPrompt(data: {
  profile: Record<string, string>;
  scores: Record<string, number>;
  highCategories: string[];
  lowCategories: string[];
  mainType: string;
  subType: string;
}): string {
  const hasBirthDate = Boolean(data.profile.birthDate);
  // 毎回異なる生成のためのシード（再生成でも別の結果になる）
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // スコアの合計値・分散から個性シグネチャを生成
  const scoreValues = Object.values(data.scores);
  const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const variance = scoreValues.reduce((a, b) => a + (b - avg) ** 2, 0) / scoreValues.length;
  const signature = `平均${avg.toFixed(1)}/分散${variance.toFixed(1)}`;

  return `以下のユーザーデータをもとに、JSON形式でオーダーメイドの診断結果を日本語で作成してください。
プロフィールとスコアの掛け合わせで、このユーザーだけの固有の分析を行ってください。

【生成シード: ${seed}】
【スコア特性: ${signature}】

【ユーザープロフィール】
${JSON.stringify(data.profile, null, 2)}

【カテゴリスコア（各10〜50点、こだわりの強さを表す。高い＝良いではない）】
${JSON.stringify(data.scores, null, 2)}

【高得点カテゴリ（こだわりが特に強い領域）】
${JSON.stringify(data.highCategories)}

【低得点カテゴリ（こだわりが比較的弱い・おおらかな領域）】
${JSON.stringify(data.lowCategories)}

【主タイプ】
${data.mainType}

【サブタイプ】
${data.subType}

要件（※出力が長くなりすぎないよう、各セクション指定字数を守ること）:
- mainType, subType を含める
- overallType は200字程度。上位カテゴリの組み合わせが生む独自の傾向を分析
- highScoreDeepDive は3カテゴリ以上、各150字程度。スコア値に言及
- categoryFeedbacks は10カテゴリすべて、各100字程度
- idealPartnerAnalysis は具体的に書く
- compatibilityAnalysis は romance, marriage, business, friendship, client の5つ。各200字程度
- encounterHints は300字程度。${new Date().getFullYear()}年の現実的な出会い方を提案。マッチングアプリを最優先で推奨し、プロフィール・写真・メッセージのコツを含める${data.profile.ageRange ? `（年代: ${data.profile.ageRange}）` : ""}。セミナー・ワークショップ・コミュニティは非推奨
- moneyAnalysis は150字程度${data.profile.financialHabit ? `。金銭習慣「${data.profile.financialHabit}」とスコアの関連を分析` : ""}
- loveAndMarriageAnalysis は150字程度${data.profile.familyStructure ? `。家族構成「${data.profile.familyStructure}」を踏まえる` : ""}
- regionalCompatibility は150字程度。相性の良い都道府県を3つ以上、県民性に基づいて提案${data.profile.birthPlace ? `。出身地: ${data.profile.birthPlace}` : ""}
- fourPillarsInsight は200字程度。${hasBirthDate ? `生年月日（${data.profile.birthDate}）から命式を算出し、価値観スコアと統合分析` : "スコアパターンから五行傾向を推定"}
- partnerCheckGuide は120字程度
- compatibilityNarrative は150字程度。カウンセラー調の自然な文体
- counselorMessage は150字程度。スコア値に言及しパーソナライズする
- プロフィール情報（趣味・性格タイプ・リテラシー・美容関心・部活経験・移動手段など）はすべてJSON内に含まれている。各セクションでこれらの情報を活用してパーソナライズすること
- すべて自然な日本語で、読みやすい段落構成にする
- JSON以外の文字は出力しない

出力JSONスキーマ:
{
  "mainType": "string",
  "subType": "string",
  "overallType": { "title": "string", "text": "string" },
  "highScoreDeepDive": [{ "categoryId": "string", "title": "string", "text": "string" }],
  "categoryFeedbacks": [{ "categoryId": "string", "title": "string", "score": number, "text": "string" }],
  "idealPartnerAnalysis": { "title": "string", "text": "string" },
  "compatibilityAnalysis": {
    "romance": { "title": "string", "text": "string (200字程度)" },
    "marriage": { "title": "string", "text": "string (200字程度)" },
    "business": { "title": "string", "text": "string (200字程度)" },
    "friendship": { "title": "string", "text": "string (200字程度)" },
    "client": { "title": "string", "text": "string (200字程度)" }
  },
  "compatibilityNarrative": { "title": "string", "text": "string" },
  "encounterHints": { "title": "string", "text": "string" },
  "moneyAnalysis": { "title": "string", "text": "string" },
  "loveAndMarriageAnalysis": { "title": "string", "text": "string" },
  "regionalCompatibility": { "title": "string", "text": "string" },
  "fourPillarsInsight": { "title": "string", "text": "string" },
  "partnerCheckGuide": { "title": "string", "text": "string" },
  "counselorMessage": { "title": "string", "text": "string" }
}`;
}
