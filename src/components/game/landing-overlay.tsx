"use client";

import { AnimatePresence, motion } from "framer-motion";

import { HeroTitle } from "@/components/game/hero-title";
import { WordMarquee } from "@/components/game/word-marquee";

type LandingOverlayProps = {
  visible: boolean;
  words: string[];
  onStart: () => void;
};

export function LandingOverlay({ visible, words, onStart }: LandingOverlayProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950"
        >
          <WordMarquee
            words={words}
            className="z-0 opacity-20"
            itemClassName="text-slate-100/80 drop-shadow-[0_10px_30px_rgba(15,118,110,0.3)]"
          />
          <motion.div
            className="relative z-10 flex max-w-4xl flex-col items-center gap-10 px-6 text-center"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.65, ease: "easeOut" }}
          >
            <HeroTitle variant="landing" text="WORDLE" />
            <motion.p
              className="max-w-2xl text-lg text-slate-100/80"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
            >
              Glide into a luminous grid of vocabulary. Every solved puzzle reveals definitions and boosts your streak.
            </motion.p>
            <motion.button
              type="button"
              onClick={onStart}
              className="group relative overflow-hidden rounded-full border border-slate-200/40 bg-slate-100/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.35rem] text-slate-100 shadow-[0_20px_60px_-20px_rgba(56,189,248,0.55)] backdrop-blur transition-transform duration-300 ease-out hover:-translate-y-1 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.45, ease: "easeOut" }}
            >
              <span className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-500/30 via-cyan-500/25 to-sky-500/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              Start Game
            </motion.button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
