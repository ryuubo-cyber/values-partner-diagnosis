"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

interface FieldDef {
  key: string;
  label: string;
  type: "date" | "select" | "text";
  placeholder?: string;
  options?: string[];
}

const FIELDS: FieldDef[] = [
  {
    key: "birthDate",
    label: "生年月日",
    type: "date",
  },
  {
    key: "gender",
    label: "性別",
    type: "select",
    options: ["男性", "女性", "その他", "回答しない"],
  },
  {
    key: "ageRange",
    label: "年代",
    type: "select",
    options: ["10代", "20代前半", "20代後半", "30代前半", "30代後半", "40代", "50代以上"],
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
      "会社員（事務・管理系）", "会社員（営業・企画系）", "会社員（技術・エンジニア系）",
      "公務員", "自営業・フリーランス", "経営者・役員",
      "医療・福祉関連", "教育関連", "クリエイティブ職",
      "サービス業", "パート・アルバイト", "学生", "主婦・主夫", "その他",
    ],
  },
  {
    key: "familyStructure",
    label: "現在の暮らし方",
    type: "select",
    options: [
      "ひとり暮らし", "実家暮らし", "パートナーと同棲",
      "配偶者と二人暮らし", "子供のいる家庭", "シェアハウス", "その他",
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

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const sessionId = localStorage.getItem("vpd_sessionId");
    if (!sessionId) {
      router.push("/");
      return;
    }

    setSaving(true);
    try {
      await fetch(`/api/diagnosis/session/${sessionId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (error) {
      console.error("Profile save error:", error);
    }
    setSaving(false);
    router.push("/diagnosis/1");
  }

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
