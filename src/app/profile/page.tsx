"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

const FIELDS = [
  { key: "birthDate", label: "生年月日", placeholder: "例: 1992-07-01", type: "date" },
  { key: "birthPlace", label: "出身地", placeholder: "例: 大阪府大阪市", type: "text" },
  { key: "currentResidence", label: "現在の住まい", placeholder: "例: 東京都練馬区", type: "text" },
  { key: "favoriteMusic", label: "音楽の好み", placeholder: "例: Official髭男dism", type: "text" },
  { key: "politicalInterest", label: "政治的関心", placeholder: "例: 教育政策に関心あり", type: "text" },
  { key: "occupation", label: "職業／属性", placeholder: "例: IT業界・営業職", type: "text" },
  { key: "familyStructure", label: "家族構成", placeholder: "例: ひとり暮らし", type: "text" },
  { key: "lifestyle", label: "生活スタイル", placeholder: "例: 週末はカフェ巡り", type: "text" },
  { key: "smartphone", label: "スマホ機種", placeholder: "例: iPhone 14 Pro", type: "text" },
  { key: "snsUsage", label: "SNSの使い方", placeholder: "例: Instagram中心、Xは閲覧のみ", type: "text" },
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
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={form[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
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
