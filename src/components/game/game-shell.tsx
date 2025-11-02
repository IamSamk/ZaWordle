"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Board } from "@/components/game/board";
import { DefinitionDialog } from "@/components/game/definition-dialog";
import { DifficultyDialog } from "@/components/game/difficulty-dialog";
import { HeroTitle } from "@/components/game/hero-title";
import { Keyboard } from "@/components/game/keyboard";
import { StreakCard } from "@/components/game/streak-card";
import { useToast } from "@/hooks/use-toast";
import type {
	DictionaryBuckets,
	Difficulty,
	GuessEvaluation,
	LetterStatus,
	WordEntry,
} from "@/lib/types";

const MAX_ATTEMPTS = 6;
const STREAK_STORAGE_KEY = "wordleop:streak";
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

export function GameShell({ dictionary }: GameShellProps) {
	const { toast } = useToast();

	const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
	const [solution, setSolution] = useState<WordEntry | null>(null);
	const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
	const [evaluations, setEvaluations] = useState<GuessEvaluation[]>([]);
	const [currentGuess, setCurrentGuess] = useState("");
	const [showDifficultyModal, setShowDifficultyModal] = useState(true);
	const [invalidRow, setInvalidRow] = useState<number | null>(null);
	const [streak, setStreak] = useState<StreakState>(() => {
		if (typeof window === "undefined") {
			return defaultStreak;
		}

		try {
			const stored = window.localStorage.getItem(STREAK_STORAGE_KEY);
			if (!stored) {
				return defaultStreak;
			}

			const parsed = JSON.parse(stored) as Partial<StreakState>;

			return {
				current: typeof parsed.current === "number" ? parsed.current : 0,
				best: typeof parsed.best === "number" ? parsed.best : 0,
			};
		} catch (error) {
			console.warn("Failed to restore streak from storage", error);
			return defaultStreak;
		}
	});

		const invalidRowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const counts = useMemo(
		() => ({
			easy: dictionary.easy.length,
			medium: dictionary.medium.length,
			hard: dictionary.hard.length,
		}),
		[dictionary],
	);

	const allWordsSet = useMemo(
		() =>
			new Set(
				[...dictionary.easy, ...dictionary.medium, ...dictionary.hard].map(
					({ word }) => word,
				),
			),
		[dictionary],
	);

	const wordLength =
		solution?.length ?? (difficulty === "hard" ? 7 : difficulty === "medium" ? 6 : 5);

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
			setGameStatus("playing");
			setShowDifficultyModal(false);
		},
		[dictionary, solution, toast],
	);

	const handleSubmitGuess = useCallback(() => {
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
			(evaluation) => evaluation.letters.map(({ letter }) => letter).join("") === normalized,
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

		if (normalized === solution.word) {
			updateStreak(true);
			setGameStatus("won");
			return;
		}

		if (nextEvaluations.length >= MAX_ATTEMPTS) {
			updateStreak(false);
			setGameStatus("lost");
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
				setCurrentGuess((previous) => previous.slice(0, -1));
				return;
			}

			if (LETTER_REGEX.test(key)) {
				setCurrentGuess((previous) => {
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

	const showDefinition = gameStatus === "won" || gameStatus === "lost";

		useEffect(() => {
			return () => {
				if (invalidRowTimeout.current) {
					clearTimeout(invalidRowTimeout.current);
				}
			};
		}, []);

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
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
					<HeroTitle />
					<motion.p
						className="mx-auto mt-6 max-w-xl text-center text-base text-muted-foreground"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
					>
						Each guess shapes the grid, every finish reveals the definition. Maintain your streak, explore richer vocabulary.
					</motion.p>
					<div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<StreakCard current={streak.current} best={streak.best} />
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
							className="rounded-3xl border border-border/30 bg-card/60 px-4 py-3 text-sm text-muted-foreground backdrop-blur"
						>
							{difficulty ? (
								<span className="capitalize text-foreground">{difficulty}</span>
							) : (
								<span>Select a difficulty to start playing.</span>
							)}
							<span className="ml-2 text-muted-foreground/70">
								{wordLength}-letter words · {MAX_ATTEMPTS} attempts
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
			/>

			{solution && (
				<DefinitionDialog
					open={showDefinition}
					status={gameStatus === "won" ? "won" : "lost"}
					word={solution.word}
					definition={solution.definition}
					onPlayAgain={handlePlayAgain}
				/>
			)}
		</div>
	);
}
