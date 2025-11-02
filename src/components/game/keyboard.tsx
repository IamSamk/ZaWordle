"use client";

import { motion } from "framer-motion";
import { Delete } from "lucide-react";

import type { LetterStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"],
] as const;

const keyStatusStyles: Record<LetterStatus, string> = {
  pending: "border-border/30 bg-slate-800/70 text-slate-200",
  correct:
    "border-emerald-400/70 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_14px_36px_-22px_rgba(34,197,94,0.85)]",
  present:
    "border-amber-400/70 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 shadow-[0_14px_36px_-22px_rgba(251,191,36,0.85)]",
  absent: "border-slate-600 bg-slate-800 text-slate-400",
};

type KeyboardProps = {
  onKeyPress: (key: string) => void;
  letterStatuses: Map<string, LetterStatus>;
  disabled?: boolean;
};

export function Keyboard({ onKeyPress, letterStatuses, disabled }: KeyboardProps) {
  return (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-3xl border border-border/40 bg-slate-950/75 p-4 shadow-[0_36px_90px_-48px_rgba(59,130,246,0.35)] backdrop-blur-xl">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex justify-center gap-2">
          {row.map((key) => {
            const label = key === "backspace" ? "⌫" : key === "enter" ? "Enter" : key.toUpperCase();
            const status = letterStatuses.get(key) ?? "pending";

            return (
              <motion.button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onKeyPress(key)}
                whileTap={{ scale: disabled ? 1 : 0.92 }}
                className={cn(
                  "flex h-12 min-w-[2.6rem] flex-1 select-none items-center justify-center rounded-xl border text-sm font-semibold uppercase tracking-wide transition-colors",
                  key === "enter" || key === "backspace"
                    ? "basis-[3.8rem] px-3 text-xs sm:text-sm"
                    : "px-2",
                  keyStatusStyles[status],
                  disabled && "opacity-60",
                )}
              >
                {key === "backspace" ? <Delete className="h-4 w-4" aria-hidden /> : label}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
