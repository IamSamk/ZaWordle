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
import type { Difficulty } from "@/lib/types";
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

type DifficultyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (difficulty: Difficulty) => void;
  counts: Record<Difficulty, number>;
};

export function DifficultyDialog({
  open,
  onClose,
  onSelect,
  counts,
}: DifficultyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-3xl border-none bg-background/90 p-8 backdrop-blur-xl">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-3xl font-semibold tracking-tight">
            Pick your challenge
          </DialogTitle>
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
