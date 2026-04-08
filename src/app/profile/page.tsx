"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/Button";

interface FieldDef {
  key: string;
  label: string;
  type: "date" | "select" | "text";
  placeholder?: string;
  options?: string[];
  description?: string;
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
      // 専門職・士業
      "医師",
      "看護師・助産師",
      "薬剤師",
      "歯科医師・歯科衛生士",
      "理学療法士・作業療法士",
      "介護士・ヘルパー",
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
      // サービス・接客
      "飲食店スタッフ・調理師",
      "美容師・エステティシャン",
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
    key: "lifestyle",
    label: "休日の過ごし方",
    type: "select",
    options: [
      "アウトドア派（旅行・スポーツ・自然）",
      "インドア派（読書・映画・ゲーム）",
      "社交派（友人と会う・イベント参加）",
      "自己投資派（勉強・資格・スキルアップ）",
      "リラックス派（カフェ・散歩・のんびり）",
      "クリエイティブ派（料理・DIY・創作）",
    ],
  },
  {
    key: "snsUsage",
    label: "よく使うSNS",
    type: "select",
    options: [
      "Instagram中心", "X（Twitter）中心", "LINE中心",
      "TikTok中心", "YouTube中心", "Facebook中心",
      "あまりSNSは使わない", "複数を均等に使う",
    ],
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
    description: "パートナーとの食の相性は重要です",
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
    description: "金銭感覚の違いは関係に大きく影響します",
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
    description: "家族関係はパートナーシップにも影響します",
  },
  {
    key: "politicalInterest",
    label: "社会問題への関心",
    type: "select",
    options: [
      "とても関心がある", "やや関心がある",
      "普通", "あまり関心がない", "ほとんど関心がない",
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSubmit() {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    // Auto-calculate ageRange from birthDate
    const submitData = { ...form };
    if (submitData.birthDate) {
      submitData.ageRange = calcAgeRange(submitData.birthDate);
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

      <div className="space-y-4 mb-8">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-text-muted mb-1">{field.description}</p>
            )}
            {field.type === "select" && field.options ? (
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
