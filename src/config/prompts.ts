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
- TOP5リスト形式ではなく、各関係タイプ（恋愛・結婚・仕事・友人・クライアント）ごとに600字以上の自然な文章で書く
- 「どんな人が合うか」をスコアの組み合わせから具体的に描写する
- パートナー候補に「期待してはいけない部分」と「任せたほうが良い部分」も含める
- 恋愛と結婚で求めるものが異なる場合はその違いを明確にする
- 抽象的なタイプ名の羅列ではなく、人物像が想像できるレベルで書く

■ 出会いのヒント（encounterHints）のルール
- 【最重要】マッチングアプリを最優先で推奨する。以下の現実を踏まえて具体的に書く：
  - 20代〜40代男性：マッチングアプリが最も効率的な出会い手段。母数が数百万人で、価値観が合う人を効率的に探せる
  - 20代〜30代女性：マッチングアプリで非常に有利。プロフィール最適化のコツを具体的に教える
  - 40代女性：マッチングアプリは十分に有効。年齢で諦める必要はない。プロフィールの書き方次第で出会いの質が変わる
  - 10代〜20代前半：SNS（X、Instagram、TikTok）やバイト先・学校での自然な出会いが多い現実を反映する
  - 具体的なアプリ名を出す必要はないが、「複数のアプリを並行利用する」「写真の選び方」「プロフィール文のコツ」など実践的なアドバイスを含める
- 異業種交流会・ワークショップ・セミナー形式のイベントは出会いの場として推奨しない（母数が少なく非効率、勧誘目的の参加者も多い）
- 職場・取引先・学生時代のつながりなど既存の人間関係からの発展にも言及する
- 行きつけの店・日常動線上の出会いにも触れる
- 結婚相談所は万人向けではない（コミュニケーションに課題がある方が多い傾向）ことを踏まえる
- 習い事やスクールでの出会いは母数が少なく稀であることを認識し、補助的にのみ提案する
- 資産形成セミナー・FP講座・投資サークルは詐欺リスクが高いため推奨しない（※お金の勉強自体を否定しない→moneyAnalysisで扱う）
- コミュニティ参加・ボランティア・カフェ会などは推奨しない（母数が少なく効率が悪い）

■ 四柱推命（fourPillarsInsight）のルール
- 生年月日がある場合は命式を詳細に算出する
- 年柱・月柱・日柱の天干地支を明記
- 五行バランス（木・火・土・金・水）の個数と過不足を分析
- 日干から本命の性格・恋愛傾向・相性を鑑定
- 算命学的な視点（守護神、天中殺など）も可能な範囲で加える
- 100問の価値観スコアとの統合分析を行う
- 800字以上で書くこと

■ 出力要件
- categoryFeedbacksは10カテゴリすべて返す
- highScoreDeepDiveは3カテゴリ以上返す
- compatibilityAnalysisは romance, marriage, business, friendship, client の5つの自然言語分析（各600字以上）`;

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

  return `以下は価値観診断アプリのユーザーデータです。
このデータをもとに、指定されたJSON形式で、このユーザーだけのオーダーメイドの診断結果を日本語で作成してください。
同じスコアパターンの人が100人いても、プロフィールの違いによって100通りの結果が出るようにしてください。
また、同じ人が再生成しても、異なる切り口・比喩・表現で別の文章を生成してください。

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

要件:
- mainType, subType を含める
- overallType は500字以上。このユーザーの上位カテゴリの「組み合わせ」が生む独自の傾向を分析する
- highScoreDeepDive は3カテゴリ以上、各400字前後。スコア値に具体的に言及する
- categoryFeedbacks は10カテゴリすべて、各300字前後。「こだわりの強さ」として中立的に解釈する
- idealPartnerAnalysis は具体的に書く。高得点カテゴリ×低得点カテゴリの組み合わせから導く
- compatibilityAnalysis は romance, marriage, business, friendship, client の5つ。各600字以上の自然な文章で書く
  - TOP5リストではなく、「どんな人が合うか」「期待しすぎない方がいい部分」「相手に任せた方がいい部分」をスコアに基づいて語る
  - 恋愛と結婚で求めるものの違いを明確にする
  - 人物像が想像できる具体性で書く
- encounterHints は800字以上の完全オーダーメイド。以下を必ず含める：
  - 現在は${new Date().getFullYear()}年。現実的な出会い方を多角的に提案する
  - 【最優先】マッチングアプリを最も推奨する出会い手段として詳しく書く：
    - 母数が数百万人で効率的に価値観の合う相手を探せる
    - 複数アプリの並行利用を推奨
    - プロフィール写真の選び方、自己紹介文の書き方のコツ
    - 最初のメッセージの送り方
    - ${data.profile.ageRange ? `このユーザーの年代「${data.profile.ageRange}」に合ったアプリ戦略` : "年代に合ったアプリ戦略"}
  - 職場・取引先・既存の人間関係からの発展（2番目に推奨）
  - 行きつけの店・日常動線上の出会い
  - 異業種交流会・ワークショップ・セミナー形式イベントは推奨しない（母数が少なく非効率、勧誘リスクあり）
  - コミュニティ・習い事・カフェ会・料理教室は推奨しない（母数が少なく非効率）
  - 結婚相談所は万人向けではないことを踏まえる
  ${data.profile.occupation ? `- 職業は「${data.profile.occupation}」。仕事環境を活かした出会いの可能性にも言及する` : ""}
  ${data.profile.currentResidence ? `- 住まいは「${data.profile.currentResidence}」。地域の特性を踏まえる` : ""}
  ${data.profile.lifestyle ? `- 生活スタイルは「${data.profile.lifestyle}」。このライフスタイルと自然に両立する出会い方を提案する` : ""}
  - 高得点カテゴリ（${data.highCategories.join("、")}）の価値観を持つ相手と出会いやすい具体的な場面を提案する
  - 「日常の中で今日から実践できること」を1つ以上含める
  - 「あなたが陥りやすいパターンと避けるべきこと」を1つ以上含める
  - 資産形成セミナー・FP講座・投資サークルは出会いの場としては詐欺リスクが高い（お金の勉強自体は否定しない→moneyAnalysisで扱う）
- moneyAnalysis は500字以上で重点的に分析。moneyスコアだけでなく、career・family・lifestyleとの掛け合わせで深掘りする${data.profile.financialHabit ? `。このユーザーのお金の使い方は「${data.profile.financialHabit}」。この金銭習慣とスコアの関連を分析する` : ""}。お金の知識を身につける方法（書籍、信頼できるFP相談、資格取得等）はこのセクションで提案してよい
- loveAndMarriageAnalysis は500字以上。family・communication・selfcareのスコア組み合わせから独自の恋愛パターンを分析${data.profile.familyStructure ? `。現在の家族構成「${data.profile.familyStructure}」を踏まえた現実的な恋愛・結婚アドバイスを含める` : ""}${data.profile.parentRelationship ? `。親との関係「${data.profile.parentRelationship}」がパートナーシップに与える影響も考察する` : ""}
- regionalCompatibility は500字以上。スコアパターンから相性の良い日本の都道府県・地域文化を県民性（県ごとの性格傾向・恋愛観・金銭感覚・コミュニケーションスタイル）に基づいて分析する。具体的な都道府県名を3つ以上挙げ、なぜそのユーザーと相性が良いかをスコアと紐づけて説明する${data.profile.birthPlace ? `。出身地（${data.profile.birthPlace}）の県民性との相性・影響も分析する` : ""}${data.profile.currentResidence ? `。現在の住まい（${data.profile.currentResidence}）の地域性との関係も考慮する` : ""}
- fourPillarsInsight は800字以上。${hasBirthDate ? `生年月日（${data.profile.birthDate}）から実際の四柱推命の命式を算出する。年柱・月柱・日柱の天干地支を明記し、五行バランス（木火土金水の個数と過不足）を分析する。日干を本命として性格・恋愛傾向・パートナー相性を詳しく鑑定する。可能であれば算命学的な視点（守護神、天中殺、大運の流れ等）も加える。100問の価値観スコアと五行の関連を統合分析する` : "スコアパターンから五行の傾向を推定し、パートナー相性を分析する"}
- partnerCheckGuide は400字以上。恋愛・仕事・友人・クライアントそれぞれの関係で比較すべきカテゴリと基準を、このユーザーのスコアに基づいて具体的に解説
- compatibilityNarrative は500字以上。compatibilityTop5のリストをまとめ、「あなたにとって理想的な人間関係」を恋愛・結婚・仕事・友人・クライアントを横断して語る文章。リスト形式ではなく、カウンセラーが語りかけるような自然な文体で書く
- counselorMessage は500字以上。以下を必ず含める：
  - このユーザーの具体的なスコア値（高得点・低得点カテゴリの点数）に言及する
  - プロフィール情報（年代、職業、住まい等）に触れてパーソナライズする
  - 「あなたのスコアパターンを見ると」のように、データに基づいた具体的な励まし
  - 高得点カテゴリの組み合わせが示す「あなたならではの強み」
  - 今後の恋愛・パートナー探しに向けた具体的なアドバイス
  - テンプレート的な励ましは禁止。このユーザーだけに向けた言葉を書く
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
    "romance": { "title": "string", "text": "string (600字以上)" },
    "marriage": { "title": "string", "text": "string (600字以上)" },
    "business": { "title": "string", "text": "string (600字以上)" },
    "friendship": { "title": "string", "text": "string (600字以上)" },
    "client": { "title": "string", "text": "string (600字以上)" }
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
