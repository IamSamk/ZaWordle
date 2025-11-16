"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Board } from "@/components/game/board";
import { CursorTrail } from "@/components/game/cursor-trail";
import { DefinitionDialog } from "@/components/game/definition-dialog";
import { DifficultyDialog } from "@/components/game/difficulty-dialog";
import { HeroTitle } from "@/components/game/hero-title";
import { Keyboard } from "@/components/game/keyboard";
import { StreakCard } from "@/components/game/streak-card";
import { WordMarquee } from "@/components/game/word-marquee";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/supabase/auth";
import { updateDailyStreak, saveBlitzScore, saveSpeedrunScore } from "@/lib/supabase/game";
import type {
  DictionaryBuckets,
  Difficulty,
  GuessEvaluation,
  LetterStatus,
  TimerDuration,
  WordEntry,
} from "@/lib/types";
import { toast as sonnerToast } from "sonner";

const MAX_ATTEMPTS = 6;
const STREAK_STORAGE_KEY = "wordleop:streak";
const GAME_STATE_KEY = "wordleop:gameState";
const LETTER_REGEX = /^[a-z]$/;

const statusPriority: Record<LetterStatus, number> = {
  pending: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

type StreakState = {
  current: number;
  best: number;
};

type GameStatus = "idle" | "playing" | "won" | "lost";

type GameShellProps = {
  dictionary: DictionaryBuckets;
  mode: "classic" | "blitz" | "speedrun";
  initialDifficulty: Difficulty;
  timerDuration?: number;
};

type GameState = {
  mode: "classic" | "blitz" | "speedrun";
  difficulty: Difficulty;
  timerDuration?: number;
  solution: WordEntry;
  evaluations: GuessEvaluation[];
  currentGuess: string;
  gameStatus: GameStatus;
  streak: StreakState;
  elapsedTime?: number;
  remainingTime?: number;
};

const defaultStreak: StreakState = { current: 0, best: 0 };

const evaluateGuess = (guess: string, solution: string): GuessEvaluation => {
  const length = solution.length;
  const statuses: LetterStatus[] = Array.from({ length }, () => "absent");
  const solutionChars = solution.split("");
  const guessChars = guess.split("");
  const remaining = new Map<string, number>();

  for (let index = 0; index < length; index += 1) {
    if (guessChars[index] === solutionChars[index]) {
      statuses[index] = "correct";
    } else {
      const letter = solutionChars[index];
      remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
    }
  }

  for (let index = 0; index < length; index += 1) {
    if (statuses[index] === "correct") {
      continue;
    }

    const letter = guessChars[index];
    const allowance = remaining.get(letter) ?? 0;

    if (allowance > 0) {
      statuses[index] = "present";
      remaining.set(letter, allowance - 1);
    } else {
      statuses[index] = "absent";
    }
  }

  return {
    letters: guessChars.map((letter, index) => ({
      letter,
      status: statuses[index],
    })),
  };
};

const selectRandomWord = (words: WordEntry[], exclude?: string): WordEntry => {
  if (words.length === 0) {
    throw new Error("No words available to select");
  }

  if (words.length === 1) {
    return words[0];
  }

  let candidate = words[Math.floor(Math.random() * words.length)];

  if (exclude && words.length > 1) {
    let safeguard = 0;
    while (candidate.word === exclude && safeguard < 5) {
      candidate = words[Math.floor(Math.random() * words.length)];
      safeguard += 1;
    }
  }

  return candidate;
};

export function GameShell({ dictionary, mode, initialDifficulty, timerDuration }: GameShellProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [solution, setSolution] = useState<WordEntry | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [evaluations, setEvaluations] = useState<GuessEvaluation[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [invalidRow, setInvalidRow] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakState>(defaultStreak);
  const [selectedTimer, setSelectedTimer] = useState<TimerDuration>(timerDuration ?? Infinity);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const invalidRowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedStreak = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STREAK_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StreakState>;
      const next: StreakState = {
        current: typeof parsed.current === "number" ? parsed.current : 0,
        best: typeof parsed.best === "number" ? parsed.best : 0,
      };

      window.requestAnimationFrame(() => {
        if (hasHydratedStreak.current) {
          return;
        }

        hasHydratedStreak.current = true;
        setStreak(next);
      });
    } catch (error) {
      console.warn("Failed to restore streak from storage", error);
    }
  }, []);

  const counts = useMemo(
    () => ({
      easy: dictionary.easy.length,
      medium: dictionary.medium.length,
      hard: dictionary.hard.length,
    }),
    [dictionary],
  );

  const marqueeWords = useMemo(() => {
    const combined = [...dictionary.easy, ...dictionary.medium, ...dictionary.hard];
    if (combined.length === 0) {
      return [] as string[];
    }

    const unique = Array.from(new Set(combined.map(({ word }) => word.toUpperCase())));
    const limit = Math.min(80, unique.length);
    const step = Math.max(1, Math.floor(unique.length / limit));
    const selection: string[] = [];

    for (let index = 0; index < limit; index += 1) {
      selection.push(unique[(index * step) % unique.length]);
    }

    return selection;
  }, [dictionary]);

  const allWordsSet = useMemo(
    () =>
      new Set(
        [...dictionary.easy, ...dictionary.medium, ...dictionary.hard].map(
          ({ word }) => word,
        ),
      ),
    [dictionary],
  );

  const fallbackWordLength = difficulty === "hard" ? 7 : difficulty === "medium" ? 5 : 5;
  const wordLength = solution?.length ?? fallbackWordLength;
  const wordLengthDescription = solution?.length
    ? `${solution.length}-letter word`
    : difficulty === "hard"
      ? "6-8 letter words"
      : difficulty === "medium"
        ? "5-letter words"
        : "4-5 letter words";

  const letterStatuses = useMemo(() => {
    const map = new Map<string, LetterStatus>();

    evaluations.forEach((evaluation) => {
      evaluation.letters.forEach(({ letter, status }) => {
        const existing = map.get(letter);
        if (!existing || statusPriority[status] > statusPriority[existing]) {
          map.set(letter, status);
        }
      });
    });

    return map;
  }, [evaluations]);

  const updateStreak = useCallback((won: boolean) => {
    setStreak((previous) => {
      const current = won ? previous.current + 1 : 0;
      const best = won ? Math.max(previous.best, current) : previous.best;
      const next: StreakState = { current, best };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const flagInvalidRow = useCallback(() => {
    setInvalidRow(evaluations.length);

    if (invalidRowTimeout.current) {
      clearTimeout(invalidRowTimeout.current);
    }

    invalidRowTimeout.current = setTimeout(() => {
      setInvalidRow(null);
      invalidRowTimeout.current = null;
    }, 650);
  }, [evaluations.length]);

  const saveGameState = useCallback(() => {
    if (!solution || gameStatus !== "playing") return;

    const state: GameState = {
      mode,
      difficulty,
      timerDuration: selectedTimer !== Infinity ? selectedTimer : undefined,
      solution,
      evaluations,
      currentGuess,
      gameStatus,
      streak,
      elapsedTime,
      remainingTime: remainingTime ?? undefined,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    }
  }, [solution, gameStatus, mode, difficulty, selectedTimer, evaluations, currentGuess, streak, elapsedTime, remainingTime]);

  const clearGameState = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GAME_STATE_KEY);
    }
  }, []);

  const startGame = useCallback(
    (level: Difficulty) => {
      const pool = dictionary[level];

      if (!pool.length) {
        toast({
          title: "Add more words to dict.csv",
          description: "We couldn't find words for that difficulty yet.",
          variant: "destructive",
        });
        return;
      }

      const candidate = selectRandomWord(pool, solution?.word);

      setDifficulty(level);
      setSolution(candidate);
      setEvaluations([]);
      setCurrentGuess("");
      setInvalidRow(null);
      setGameStatus("playing");
      setShowDifficultyModal(false);
      setElapsedTime(0);
      gameStartTimeRef.current = Date.now();

      if (mode === "speedrun" && selectedTimer !== Infinity) {
        setRemainingTime(selectedTimer);
      } else {
        setRemainingTime(null);
      }
    },
    [dictionary, solution, toast, selectedTimer, mode],
  );

  // Auto-start game on mount with useLayoutEffect to avoid setState warning
  useEffect(() => {
    let mounted = true;
    if (!solution && gameStatus === "idle" && mounted) {
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        if (mounted) startGame(initialDifficulty);
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [solution, gameStatus, initialDifficulty, startGame]);

  // Timer for Speedrun mode (count down)
  useEffect(() => {
    if (gameStatus !== "playing" || mode !== "speedrun" || remainingTime === null) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (remainingTime <= 0) {
      queueMicrotask(() => {
        updateStreak(false);
        setGameStatus("lost");
        clearGameState();
        toast({
          title: "Time's up!",
          description: "You ran out of time.",
          variant: "destructive",
        });
      });
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setRemainingTime((prev: number | null) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStatus, mode, remainingTime, updateStreak, toast, clearGameState]);

  // Timer for Blitz mode (count up)
  useEffect(() => {
    if (gameStatus !== "playing" || mode !== "blitz") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((prev: number) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStatus, mode]);

  // Save game state on changes
  useEffect(() => {
    if (gameStatus === "playing") {
      saveGameState();
    }
  }, [gameStatus, evaluations, currentGuess, elapsedTime, remainingTime, saveGameState]);

  const handleSubmitGuess = useCallback(async () => {
    if (!solution || gameStatus !== "playing") {
      return;
    }

    if (currentGuess.length !== wordLength) {
      toast({
        title: "Not enough letters",
        description: `This word needs ${wordLength} letters.`,
        variant: "destructive",
      });
      flagInvalidRow();
      return;
    }

    const normalized = currentGuess.toLowerCase();

    if (!allWordsSet.has(normalized)) {
      toast({
        title: "Word not found",
        description: "Try a word from the curated dictionary.",
        variant: "destructive",
      });
      flagInvalidRow();
      return;
    }

    const alreadyTried = evaluations.some(
      (evaluation: GuessEvaluation) => evaluation.letters.map(({ letter }: { letter: string }) => letter).join("") === normalized,
    );

    if (alreadyTried) {
      toast({
        title: "Already guessed",
        description: "Give a different word a shot.",
        variant: "destructive",
      });
      flagInvalidRow();
      return;
    }

    const evaluation = evaluateGuess(normalized, solution.word);
    const nextEvaluations = [...evaluations, evaluation];

    setEvaluations(nextEvaluations);
    setCurrentGuess("");
    setInvalidRow(null);

    const won = normalized === solution.word;
    const lost = !won && nextEvaluations.length >= MAX_ATTEMPTS;

    if (won || lost) {
      updateStreak(won);
      setGameStatus(won ? "won" : "lost");
      clearGameState();

      // Save to database if user is logged in
      if (user) {
        try {
          if (mode === "classic" && won) {
            await updateDailyStreak(user.id);
          } else if (mode === "blitz" && won) {
            const finalTime = elapsedTime;
            await saveBlitzScore(user.id, difficulty, finalTime);
            sonnerToast.success(`Blitz completed in ${finalTime}s!`);
          } else if (mode === "speedrun") {
            const wordCount = nextEvaluations.filter((e: GuessEvaluation) => 
              e.letters.map((l: { letter: string }) => l.letter).join("") === solution.word
            ).length > 0 ? nextEvaluations.length : nextEvaluations.length;
            if (timerDuration && (timerDuration === 60 || timerDuration === 180 || timerDuration === 300)) {
              await saveSpeedrunScore(user.id, difficulty, timerDuration as 60 | 180 | 300, wordCount);
              sonnerToast.success(`${wordCount} words completed!`);
            }
          }
        } catch (error) {
          console.error("Failed to save score:", error);
          sonnerToast.error("Failed to save your score");
        }
      }
    }
  }, [
    allWordsSet,
    currentGuess,
    evaluations,
    gameStatus,
    flagInvalidRow,
    solution,
    toast,
    updateStreak,
    wordLength,
    user,
    mode,
    difficulty,
    elapsedTime,
    timerDuration,
    clearGameState,
  ]);

  const handleVirtualKey = useCallback(
    (key: string) => {
      if (showDifficultyModal || gameStatus !== "playing" || !solution) {
        return;
      }

      if (key === "enter") {
        handleSubmitGuess();
        return;
      }

      if (key === "backspace") {
        setCurrentGuess((previous: string) => previous.slice(0, -1));
        return;
      }

      if (LETTER_REGEX.test(key)) {
        setCurrentGuess((previous: string) => {
          if (previous.length >= wordLength) {
            return previous;
          }

          return `${previous}${key}`;
        });
      }
    },
    [gameStatus, handleSubmitGuess, showDifficultyModal, solution, wordLength],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "enter" || key === "backspace" || LETTER_REGEX.test(key)) {
        event.preventDefault();
        handleVirtualKey(key);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleVirtualKey]);

  const handleDifficultyClose = useCallback(() => {
    if (difficulty) {
      setShowDifficultyModal(false);
    }
  }, [difficulty]);

  const handlePlayAgain = useCallback(() => {
    if (difficulty) {
      startGame(difficulty);
    } else {
      setShowDifficultyModal(true);
    }
  }, [difficulty, startGame]);

  const handleChangeMode = useCallback(() => {
    if (invalidRowTimeout.current) {
      clearTimeout(invalidRowTimeout.current);
      invalidRowTimeout.current = null;
    }

    setDifficulty(initialDifficulty);
    setSolution(null);
    setEvaluations([]);
    setCurrentGuess("");
    setInvalidRow(null);
    setGameStatus("idle");
    setShowDifficultyModal(true);
  }, [initialDifficulty]);

  const handleHomeClick = useCallback(() => {
    if (gameStatus === "playing") {
      setShowQuitDialog(true);
    } else {
      router.push("/menu");
    }
  }, [gameStatus, router]);

  const handleContinue = useCallback(() => {
    setShowQuitDialog(false);
  }, []);

  const handleSaveAndQuit = useCallback(() => {
    saveGameState();
    setShowQuitDialog(false);
    router.push("/menu");
  }, [saveGameState, router]);

  const handleAbandon = useCallback(() => {
    clearGameState();
    setShowQuitDialog(false);
    router.push("/menu");
  }, [clearGameState, router]);

  const showDefinition = gameStatus === "won" || gameStatus === "lost";

  useEffect(() => {
    return () => {
      if (invalidRowTimeout.current) {
        clearTimeout(invalidRowTimeout.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getTimerDisplay = () => {
    if (mode === "blitz") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="rounded-3xl border border-border/30 bg-card/60 px-4 py-3 text-sm backdrop-blur"
        >
          <span className="text-muted-foreground">Time: </span>
          <span className="font-mono text-lg text-foreground">
            {formatTime(elapsedTime)}
          </span>
        </motion.div>
      );
    }

    if (mode === "speedrun" && remainingTime !== null) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="rounded-3xl border border-border/30 bg-card/60 px-4 py-3 text-sm backdrop-blur"
        >
          <span className="text-muted-foreground">Time Remaining: </span>
          <span className="font-mono text-lg text-foreground">
            {formatTime(remainingTime)}
          </span>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <>
      <CursorTrail />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
        <WordMarquee words={marqueeWords} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.22),transparent_60%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
        />

        <div className="relative z-10 flex min-h-screen flex-col items-center">
          <header className="w-full max-w-5xl px-6 pt-16 sm:pt-20">
            <div className="flex items-center justify-between">
              <HeroTitle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHomeClick}
                className="h-10 w-10 rounded-full bg-card/40 backdrop-blur hover:bg-card/60"
                aria-label="Return to menu"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
            <motion.p
              className="mx-auto mt-6 max-w-xl text-center text-base text-muted-foreground"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              Each guess shapes the grid, every finish reveals the definition. Maintain your streak, explore richer vocabulary.
            </motion.p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {mode === "classic" && <StreakCard current={streak.current} best={streak.best} />}
              {getTimerDisplay()}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                className="rounded-3xl border border-border/30 bg-card/60 px-4 py-3 text-sm text-muted-foreground backdrop-blur"
              >
                <span className="capitalize text-foreground">{mode}</span>
                <span className="mx-2">·</span>
                <span className="capitalize text-foreground">{difficulty}</span>
                <span className="ml-2 text-muted-foreground/70">
                  {wordLengthDescription} · {MAX_ATTEMPTS} attempts
                </span>
              </motion.div>
            </div>
          </header>

          <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-20 pt-8">
            <Board
              wordLength={wordLength}
              maxAttempts={MAX_ATTEMPTS}
              evaluations={evaluations}
              currentGuess={currentGuess}
              invalidRow={invalidRow}
            />
            <Keyboard
              onKeyPress={handleVirtualKey}
              letterStatuses={letterStatuses}
              disabled={gameStatus !== "playing"}
            />
          </main>
        </div>

        <DifficultyDialog
          open={showDifficultyModal}
          onClose={handleDifficultyClose}
          onSelect={startGame}
          counts={counts}
          selectedTimer={selectedTimer}
          onTimerChange={setSelectedTimer}
        />

        {solution && (
          <DefinitionDialog
            open={showDefinition}
            status={gameStatus === "won" ? "won" : "lost"}
            word={solution.word}
            definition={solution.definition}
            onPlayAgain={handlePlayAgain}
            onChangeMode={handleChangeMode}
          />
        )}

        <AnimatePresence>
          {showQuitDialog && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={handleContinue}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Quit Game?</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your game is still in progress. What would you like to do?
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleContinue}
                    className="h-8 w-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleContinue}
                    variant="default"
                    className="w-full"
                  >
                    Continue Playing
                  </Button>
                  <Button
                    onClick={handleSaveAndQuit}
                    variant="outline"
                    className="w-full"
                  >
                    Save & Quit
                  </Button>
                  <Button
                    onClick={handleAbandon}
                    variant="destructive"
                    className="w-full"
                  >
                    Abandon Game
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}