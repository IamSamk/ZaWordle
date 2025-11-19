"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusCopy = {
  won: {
    title: "Stellar solve!",
    accent: "from-emerald-400/20 to-sky-500/30",
  },
  lost: {
    title: "Let's unpack that word",
    accent: "from-sky-400/20 to-cyan-500/30",
  },
};

type DefinitionDialogProps = {
  open: boolean;
  status: "won" | "lost";
  word: string;
  definition: string;
  onPlayAgain: () => void;
  onChangeMode: () => void;
};

export function DefinitionDialog({
  open,
  status,
  word,
  definition,
  onPlayAgain,
}: DefinitionDialogProps) {
  const content = statusCopy[status];
  const router = useRouter();

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xl border border-border/30 bg-background/95 p-8 backdrop-blur-xl pointer-events-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Every round ends with a quick vocabulary boost.
          </DialogDescription>
        </DialogHeader>
        <motion.div
          className={`rounded-3xl border border-border/30 bg-gradient-to-br ${content.accent} p-6 shadow-[0_28px_80px_-40px_rgba(59,130,246,0.45)]`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <p className="text-sm font-medium uppercase tracking-[0.4rem] text-muted-foreground/70">
            Word of the round
          </p>
          <p className="mt-4 text-3xl font-bold capitalize text-foreground">
            {word}
          </p>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">
            {definition}
          </p>
        </motion.div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => router.push("/menu")} className="cursor-pointer hover:bg-slate-800/50 hover:text-white">
            Change game mode
          </Button>
          <Button onClick={onPlayAgain} className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
            Play again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
