"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/Button";

interface FieldDef {
  key: string;
  label: string;
  type: "date" | "select" | "multi" | "text";
  placeholder?: string;
  options?: string[];
  description?: string;
  maxSelect?: number; // multi選択時の最大数
}

/** 生年月日から年代を自動計算 */
function calcAgeRange(birthDate: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 20) return "10代";
  if (age < 25) return "20代前半";
  if (age < 30) return "20代後半";
  if (age < 35) return "30代前半";
  if (age < 40) return "30代後半";
  if (age < 50) return "40代";
  return "50代以上";
}

const FIELDS: FieldDef[] = [
  {
    key: "birthDate",
    label: "生年月日",
    type: "date",
    description: "年代は生年月日から自動計算されます",
  },
  {
    key: "gender",
    label: "性別",
    type: "select",
    options: ["男性", "女性", "その他", "回答しない"],
  },
  {
    key: "birthPlace",
    label: "出身地域",
    type: "select",
    options: [
      "北海道", "東北（青森・岩手・宮城・秋田・山形・福島）",
      "関東（東京・神奈川・千葉・埼玉・茨城・栃木・群馬）",
      "中部（新潟・富山・石川・福井・山梨・長野・岐阜・静岡・愛知）",
      "近畿（大阪・京都・兵庫・奈良・三重・滋賀・和歌山）",
      "中国・四国（鳥取・島根・岡山・広島・山口・徳島・香川・愛媛・高知）",
      "九州・沖縄（福岡・佐賀・長崎・熊本・大分・宮崎・鹿児島・沖縄）",
      "海外",
    ],
  },
  {
    key: "currentResidence",
    label: "現在の住まい",
    type: "select",
    options: [
      "北海道", "東北", "関東（東京以外）", "東京都内",
      "中部・北陸", "近畿（大阪以外）", "大阪府内",
      "中国・四国", "九州・沖縄", "海外",
    ],
  },
  {
    key: "occupation",
    label: "職業",
    type: "select",
    options: [
      // 会社員系
      "会社員（事務・総務・人事）",
      "会社員（経理・財務・会計）",
      "会社員（営業・販売）",
      "会社員（企画・マーケティング・広報）",
      "会社員（SE・プログラマー・エンジニア）",
      "会社員（研究・開発・設計）",
      "会社員（製造・品質管理）",
      "会社員（物流・配送・倉庫）",
      "会社員（カスタマーサポート・コールセンター）",
      "会社員（その他）",
      // 医療・治療・リラクゼーション系
      "医師",
      "看護師・助産師",
      "薬剤師",
      "歯科医師・歯科衛生士",
      "柔道整復師",
      "鍼灸師・あん摩マッサージ指圧師",
      "整体師・カイロプラクター",
      "理学療法士・作業療法士",
      "リラクゼーションセラピスト・アロマセラピスト",
      "介護士・ヘルパー",
      // 士業・専門職
      "弁護士",
      "公認会計士・税理士",
      "社会保険労務士・行政書士",
      "建築士・設計士",
      "教師・講師（小中高）",
      "大学教員・研究者",
      "保育士・幼稚園教諭",
      // 公務員系
      "公務員（国家公務員）",
      "公務員（地方公務員）",
      "警察官・消防士・自衛官",
      // スポーツ・フィットネス
      "プロスポーツ選手・格闘家",
      "スポーツトレーナー・インストラクター",
      "パーソナルトレーナー",
      "ヨガ・ピラティスインストラクター",
      // 独立・経営系
      "経営者・役員",
      "自営業・個人事業主",
      "フリーランス（IT・Web系）",
      "フリーランス（デザイン・クリエイティブ系）",
      "フリーランス（ライター・編集系）",
      "フリーランス（その他）",
      // クリエイティブ・メディア
      "デザイナー（グラフィック・UI/UX）",
      "映像クリエイター・カメラマン",
      "音楽家・アーティスト",
      "作家・脚本家",
      "芸能・タレント・モデル",
      // IT・テクノロジー
      "データサイエンティスト・AI/ML",
      "インフラエンジニア・SRE",
      "Webディレクター・PM",
      // サービス・接客・美容
      "飲食店スタッフ・調理師・パティシエ",
      "美容師・理容師",
      "エステティシャン・ネイリスト",
      "ホテル・旅館スタッフ",
      "販売員・ショップスタッフ",
      "ブライダル・冠婚葬祭",
      // 運輸・建設・その他
      "ドライバー・運転手",
      "建設・土木作業員",
      "農業・漁業・林業",
      "不動産・住宅営業",
      "金融・銀行・証券・保険",
      "コンサルタント",
      // 非正規・学生・その他
      "パート・アルバイト",
      "派遣社員・契約社員",
      "学生（大学・大学院）",
      "学生（専門学校）",
      "学生（高校生以下）",
      "主婦・主夫",
      "無職・求職中",
      "その他",
    ],
  },
  {
    key: "familyStructure",
    label: "現在の暮らし方・家族構成",
    type: "select",
    options: [
      "ひとり暮らし（未婚）",
      "実家暮らし（未婚）",
      "パートナーと同棲中",
      "既婚・配偶者と二人暮らし",
      "既婚・子供あり（配偶者と同居）",
      "既婚・子供あり（単身赴任中）",
      "シングルマザー・シングルファーザー",
      "離婚経験あり・現在ひとり暮らし",
      "離婚経験あり・子供と暮らしている",
      "死別経験あり",
      "シェアハウス・ルームシェア",
      "その他",
    ],
  },
  {
    key: "hobbies",
    label: "趣味・好きなこと（複数選択可）",
    type: "multi",
    maxSelect: 5,
    options: [
      "旅行・お出かけ", "キャンプ・アウトドア", "登山・ハイキング",
      "ランニング・ジョギング", "筋トレ・ジム", "ヨガ・ピラティス",
      "スポーツ観戦", "スポーツ（チーム系）", "格闘技・武道",
      "釣り", "ゴルフ", "サーフィン・マリンスポーツ",
      "映画・ドラマ鑑賞", "読書", "音楽鑑賞・ライブ",
      "楽器演奏・歌", "ゲーム（スマホ・PC・PS等）", "アニメ・漫画",
      "料理・お菓子作り", "カフェ巡り", "食べ歩き・グルメ",
      "お酒・ワイン・クラフトビール", "写真・カメラ", "動画制作・配信",
      "イラスト・絵を描く", "ハンドメイド・DIY", "ファッション",
      "美容・コスメ", "ガーデニング・植物", "ペット・動物",
      "ドライブ・ツーリング", "サウナ・温泉", "ボードゲーム・カードゲーム",
      "プログラミング・テック", "投資・資産運用", "語学学習",
      "ボランティア・社会活動", "瞑想・マインドフルネス", "特になし",
    ],
    description: "最大5つまで選べます",
  },
  {
    key: "snsUsage",
    label: "よく使うSNS（複数選択可）",
    type: "multi",
    maxSelect: 3,
    options: [
      "Instagram", "X（Twitter）", "LINE", "TikTok",
      "YouTube", "Facebook", "Threads", "BeReal",
      "あまりSNSは使わない",
    ],
    description: "最大3つまで選べます",
  },
  {
    key: "transportation",
    label: "主な移動手段（複数選択可）",
    type: "multi",
    maxSelect: 3,
    options: [
      "車", "電車・バス", "自転車", "バイク・原付",
      "徒歩中心", "タクシー・配車アプリ", "なし（在宅中心）",
    ],
    description: "最大3つまで選べます",
  },
  {
    key: "foodPreference",
    label: "食の傾向",
    type: "select",
    options: [
      "健康志向（自炊中心・栄養バランス重視）",
      "グルメ志向（外食好き・食べ歩きが趣味）",
      "手軽さ重視（コンビニ・ファストフード中心）",
      "こだわりなし（出されたものを食べる）",
      "オーガニック・ヴィーガン志向",
      "お酒好き（飲み会・晩酌が多い）",
    ],
  },
  {
    key: "personalityType",
    label: "自分の性格タイプ",
    type: "select",
    options: [
      "ポジティブ（基本的に前向き）",
      "ややポジティブ（楽観的だが慎重な面もある）",
      "バランス型（状況次第）",
      "ややネガティブ（心配性・慎重派）",
      "ネガティブ（考えすぎてしまう傾向）",
    ],
  },
  {
    key: "clubActivity",
    label: "過去の部活・スポーツ経験（複数選択可）",
    type: "multi",
    maxSelect: 3,
    options: [
      "野球", "サッカー・フットサル", "バスケットボール", "バレーボール",
      "テニス・卓球・バドミントン", "陸上・水泳", "柔道・剣道・空手など武道",
      "ダンス・チアリーディング", "吹奏楽・オーケストラ", "美術・デザイン",
      "演劇・放送", "茶道・華道・書道", "写真・映像", "軽音楽・バンド",
      "帰宅部・無所属", "その他の運動部", "その他の文化部",
    ],
    description: "最大3つまで選べます",
  },
  {
    key: "beautyInterest",
    label: "美容への関心",
    type: "select",
    options: [
      "とても高い（スキンケア・脱毛・美容院にこだわる）",
      "やや高い（清潔感は大切にしている）",
      "普通（最低限のケアはする）",
      "あまりない（特にこだわらない）",
    ],
  },
  {
    key: "itLiteracy",
    label: "IT・デジタルリテラシー",
    type: "select",
    options: [
      "上級（プログラミングやAI活用ができる）",
      "中上級（PCを使いこなし、新しいツールも積極的に使う）",
      "中級（PC・スマホの基本操作は問題なし）",
      "初級（スマホ中心でPCはあまり使わない）",
      "苦手（デジタル機器は最低限しか使えない）",
    ],
    description: "AI・PC・スマホなどの活用度",
  },
  {
    key: "moneyLiteracy",
    label: "マネーリテラシー",
    type: "select",
    options: [
      "上級（NISA・iDeCo等で資産運用、ライフプラン設計済み）",
      "中上級（家計簿アプリ等で管理し、投資も少し行っている）",
      "中級（貯金はしているが、資産運用は未経験）",
      "初級（収支をなんとなく把握している程度）",
      "苦手（お金の管理はほとんどしていない）",
    ],
    description: "資産形成・家計管理の実践度",
  },
  {
    key: "financialHabit",
    label: "お金の使い方",
    type: "select",
    options: [
      "堅実派（貯金・節約が習慣）",
      "計画派（家計簿をつけ、予算管理する）",
      "投資派（資産運用・投資に積極的）",
      "楽しむ派（趣味・体験にお金を使う）",
      "あまり考えない（なんとなく使う）",
      "ローン・借入がある",
    ],
  },
  {
    key: "friendCount",
    label: "友人関係",
    type: "select",
    options: [
      "親友が数人いれば十分",
      "広く浅く付き合うタイプ",
      "友人は多い方（10人以上の仲良しグループ）",
      "友人は少ないが気にしていない",
      "友人をもっと増やしたい",
      "ほとんど友人がいない",
    ],
  },
  {
    key: "parentRelationship",
    label: "親との関係",
    type: "select",
    options: [
      "良好（定期的に連絡・会う）",
      "普通（必要な時に連絡する程度）",
      "やや疎遠（年に数回程度）",
      "疎遠・絶縁状態",
      "片親または両親を亡くしている",
      "複雑な事情がある",
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [multiForm, setMultiForm] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleMultiToggle = useCallback((key: string, value: string, maxSelect: number) => {
    setMultiForm((prev) => {
      const current = prev[key] || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [key]: [...current, value] };
    });
  }, []);

  async function handleSubmit() {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    // Auto-calculate ageRange from birthDate
    const submitData: Record<string, string> = { ...form };
    if (submitData.birthDate) {
      submitData.ageRange = calcAgeRange(submitData.birthDate);
    }
    // Multi-select fields are joined with "、"
    for (const [key, values] of Object.entries(multiForm)) {
      if (values.length > 0) {
        submitData[key] = values.join("、");
      }
    }

    setSaving(true);
    try {
      await fetch(`/api/diagnosis/session/${sessionId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
    } catch (error) {
      console.error("Profile save error:", error);
    }
    setSaving(false);
    router.push("/diagnosis/1");
  }

  // Computed age range for display
  const computedAge = form.birthDate ? calcAgeRange(form.birthDate) : "";

  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-bold text-warm-900 mb-2">
        プロフィール入力
      </h1>
      <p className="text-sm text-text-light mb-6">
        すべて任意です。入力いただくと、より精度の高い診断結果が得られます。
      </p>

      <div className="space-y-5 mb-8">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-text-muted mb-1">{field.description}</p>
            )}

            {/* 複数選択フィールド */}
            {field.type === "multi" && field.options ? (
              <div className="flex flex-wrap gap-2">
                {field.options.map((opt) => {
                  const selected = (multiForm[field.key] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleMultiToggle(field.key, opt, field.maxSelect || 5)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : "bg-surface text-text-light border-border hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : field.type === "select" && field.options ? (
              <select
                value={form[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none"
              >
                <option value="">選択してください</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            )}

            {/* Show auto-calculated age after birthDate field */}
            {field.key === "birthDate" && computedAge && (
              <p className="text-xs text-primary mt-1 font-medium">
                → 年代: {computedAge}（自動計算）
              </p>
            )}

            {/* Show selected count for multi */}
            {field.type === "multi" && (multiForm[field.key] || []).length > 0 && (
              <p className="text-xs text-primary mt-1">
                {(multiForm[field.key] || []).length}/{field.maxSelect || 5} 選択中
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "保存中..." : "入力して診断を開始"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/diagnosis/1")}
        >
          スキップして診断を開始
        </Button>
      </div>
    </div>
  );
}
