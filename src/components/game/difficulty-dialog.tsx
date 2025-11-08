"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Difficulty, TimerDuration } from "@/lib/types";
import { cn } from "@/lib/utils";

const difficultyMeta: Record<
  Difficulty,
  { label: string; description: string; accent: string }
> = {
  easy: {
    label: "Easy",
    description: "Friendly 4-5 letter words to get warmed up.",
    accent: "from-emerald-400/40 to-teal-500/20",
  },
  medium: {
    label: "Medium",
    description: "Six-letter picks that demand sharper instincts.",
    accent: "from-sky-400/40 to-indigo-500/20",
  },
  hard: {
    label: "Hard",
    description: "Longer vocabulary for seasoned wordsmiths.",
    accent: "from-purple-500/40 to-rose-500/20",
  },
};

const timerOptions: { duration: TimerDuration; label: string }[] = [
  { duration: 60, label: "1m" },
  { duration: 180, label: "3m" },
  { duration: 300, label: "5m" },
  { duration: Infinity, label: "∞" },
];

type DifficultyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (difficulty: Difficulty) => void;
  counts: Record<Difficulty, number>;
  selectedTimer: TimerDuration;
  onTimerChange: (duration: TimerDuration) => void;
};

export function DifficultyDialog({
  open,
  onClose,
  onSelect,
  counts,
  selectedTimer,
  onTimerChange,
}: DifficultyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-3xl border-none bg-background/90 p-8 backdrop-blur-xl">
        <DialogHeader className="gap-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-3xl font-semibold tracking-tight">
              Pick your challenge
            </DialogTitle>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Timer:</p>
              <div className="flex items-center gap-1 rounded-lg bg-background/70 p-1">
                {timerOptions.map(({ duration, label }) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => onTimerChange(duration)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      selectedTimer === duration
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogDescription className="text-base text-muted-foreground">
            Difficulty adjusts word length and rarity. Your streak only grows on wins.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(difficultyMeta) as Difficulty[]).map((difficulty, index) => {
            const meta = difficultyMeta[difficulty];
            const delay = 0.05 * index;

            return (
              <Fragment key={difficulty}>
                <motion.div
                  role="button"
                  tabIndex={0}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay, duration: 0.35, ease: "easeOut" }}
                  onClick={() => onSelect(difficulty)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(difficulty);
                    }
                  }}
                  className="group relative h-full cursor-pointer outline-none"
                >
                  <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-br from-background/95 to-background/70 transition-transform duration-200 ease-out group-hover:-translate-y-1 group-focus:-translate-y-1 group-focus:ring-2 group-focus:ring-emerald-400/60">
                    <CardHeader className="relative space-y-2">
                      <div
                        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.accent}`}
                        aria-hidden
                      />
                      <p className="text-lg font-semibold">{meta.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {meta.description}
                      </p>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center justify-between text-sm text-muted-foreground/90">
                      <span>{counts[difficulty]} curated words</span>
                      <span
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "pointer-events-none border-border/40",
                        )}
                      >
                        Play
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              </Fragment>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
