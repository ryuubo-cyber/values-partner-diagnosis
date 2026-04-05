"use client";

interface AnswerScaleProps {
  value: number | null;
  onChange: (value: number) => void;
}

const SCALE_OPTIONS = [
  { value: 1, label: "まったく\nあてはまらない", short: "1" },
  { value: 2, label: "あまり\nあてはまらない", short: "2" },
  { value: 3, label: "どちらとも\nいえない", short: "3" },
  { value: 4, label: "あてはまる", short: "4" },
  { value: 5, label: "とても\nあてはまる", short: "5" },
];

export function AnswerScale({ value, onChange }: AnswerScaleProps) {
  return (
    <div className="flex gap-2 justify-center w-full">
      {SCALE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              flex-1 min-w-0 py-3 px-1 rounded-xl text-xs leading-tight text-center
              transition-all duration-200 border-2
              ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-md scale-105"
                  : "bg-surface text-text-light border-warm-200 hover:border-warm-400 hover:bg-warm-50"
              }
            `}
          >
            <span className="block font-bold text-base mb-0.5">
              {option.value}
            </span>
            <span className="block whitespace-pre-line leading-tight">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
