"use client";

import { Flame } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";

type StreakCardProps = {
  current: number;
  best: number;
};

export function StreakCard({ current, best }: StreakCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="border border-border/30 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-xl">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <Flame className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3rem] text-muted-foreground">
              Streak
            </p>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-semibold text-foreground">{current}</p>
              <p className="text-sm text-muted-foreground">Best: {best}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
