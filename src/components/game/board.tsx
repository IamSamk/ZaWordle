"use client";

import { motion } from "framer-motion";

import type { GuessEvaluation, LetterStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROW_TRANSITION = { duration: 0.25, ease: "easeOut" };

const statusStyles: Record<LetterStatus, string> = {
  pending: "border-slate-600/50 bg-slate-900/40 text-slate-200/80",
  correct:
    "border-emerald-500/70 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[0_20px_52px_-28px_rgba(34,197,94,0.95)]",
  present:
    "border-amber-400/70 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-900 shadow-[0_20px_52px_-28px_rgba(251,191,36,0.9)]",
  absent: "border-slate-700 bg-slate-800 text-slate-400",
};

type BoardProps = {
  wordLength: number;
  maxAttempts: number;
  evaluations: GuessEvaluation[];
  currentGuess: string;
  invalidRow: number | null;
};

export function Board({ wordLength, maxAttempts, evaluations, currentGuess, invalidRow }: BoardProps) {
  const rows = Array.from({ length: maxAttempts }, (_, rowIndex) => {
    if (rowIndex < evaluations.length) {
      return evaluations[rowIndex].letters;
    }

    if (rowIndex === evaluations.length) {
      const padded = currentGuess.padEnd(wordLength);
      return [...padded].map((letter) => ({
        letter,
        status: "pending" as const,
      }));
    }

    return Array.from({ length: wordLength }, () => ({
      letter: "",
      status: "pending" as const,
    }));
  });

  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col gap-2 overflow-hidden rounded-3xl border border-border/40 bg-slate-950/70 p-6 shadow-[0_42px_120px_-48px_rgba(14,165,233,0.55)] backdrop-blur-xl before:absolute before:-inset-x-20 before:-top-56 before:h-96 before:rounded-full before:bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.28),transparent_60%)] before:opacity-70 before:blur-3xl before:content-['']">
      <div className="relative z-10 grid gap-2" style={{ gridTemplateRows: `repeat(${maxAttempts}, minmax(0, 1fr))` }}>
        {rows.map((row, rowIndex) => (
          <motion.div
            key={`row-${rowIndex}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{
              opacity: 1,
              y: 0,
              x: rowIndex === invalidRow ? [-10, 10, -8, 8, -4, 4, 0] : 0,
            }}
            transition={{
              ...ROW_TRANSITION,
              delay: rowIndex * 0.05,
              duration: rowIndex === invalidRow ? 0.6 : ROW_TRANSITION.duration,
            }}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}
          >
            {row.map((cell, cellIndex) => (
              <motion.div
                key={`${rowIndex}-${cellIndex}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, delay: rowIndex * 0.05 + cellIndex * 0.03 }}
                className={cn(
                  "flex h-14 items-center justify-center rounded-2xl border text-xl font-semibold uppercase tracking-[0.35rem] text-center transition-[background,transform] duration-300",
                  statusStyles[cell.status],
                  cell.letter && "backdrop-blur",
                )}
              >
                {cell.letter.toUpperCase()}
              </motion.div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
