"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DeepDiveChatProps {
  sessionId: string;
  sectionContext?: string;
  sectionTitle?: string;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "この結果をもとに、具体的にどんな行動をすればいいですか？",
  "私の価値観パターンで気をつけるべきことは？",
  "理想のパートナーとの出会い方をもっと具体的に教えてください",
  "お金の価値観が合うパートナーってどんな人ですか？",
  "この診断結果で、自分の強みは何ですか？",
];

export default function DeepDiveChat({
  sessionId,
  sectionContext,
  sectionTitle,
  onClose,
}: DeepDiveChatProps) {
  const MAX_MESSAGES = 10;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userMessageCount = messages.filter(m => m.role === "user").length;
  const remaining = MAX_MESSAGES - userMessageCount;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading || limitReached) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/diagnosis/session/${sessionId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            sectionContext,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 429) {
          setLimitReached(true);
        }
        throw new Error(json.error || "チャットエラー");
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: json.data.text },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      const errMsg = error instanceof Error ? error.message : "エラーが発生しました";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `${errMsg}`,
        },
      ]);
    }

    setIsLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-warm-800 truncate">
            診断結果を深掘り
          </h3>
          {sectionTitle && (
            <p className="text-xs text-text-muted truncate">{sectionTitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 text-warm-600 active:scale-95 transition-transform ml-2"
        >
          &#10005;
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* ウェルカムメッセージ */}
        {showSuggestions && (
          <div className="space-y-4">
            <div className="bg-warm-50 rounded-2xl p-4 border border-warm-200">
              <p className="text-sm text-warm-800 leading-relaxed">
                診断結果について、気になることを何でも聞いてください。
                {sectionTitle
                  ? `「${sectionTitle}」について深掘りします。`
                  : "各セクションの詳しい解説や、具体的な行動アドバイスをお伝えできます。"}
              </p>
              <p className="text-xs text-text-muted mt-2">
                AIがあなたのスコアやプロフィールを踏まえて、オーダーメイドで回答します。
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-text-muted font-medium">よくある質問：</p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 bg-surface border border-border rounded-xl text-sm text-warm-700 active:scale-[0.98] transition-transform hover:border-primary/40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* チャットメッセージ */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-warm-50 border border-warm-200 text-warm-800 rounded-bl-md"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* ローディング中 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-warm-50 border border-warm-200 text-warm-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-warm-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-muted">考え中...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-border bg-surface px-4 py-3">
        {limitReached || remaining <= 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-text-muted">チャット回数の上限に達しました（{MAX_MESSAGES}回）</p>
            <p className="text-xs text-text-muted mt-1">新しく診断を受けると、また利用できます。</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="質問を入力..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-warm-800 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 active:scale-90 transition-transform"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5 text-center">
              残り{remaining}回 / Enterで送信
            </p>
          </>
        )}
      </div>
    </div>
  );
}
