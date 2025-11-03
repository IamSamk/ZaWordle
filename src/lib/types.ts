export type Difficulty = "easy" | "medium" | "hard";

export type WordEntry = {
  word: string;
  definition: string;
  length: number;
  difficulty: Difficulty;
  rank: number;
};

export type DictionaryBuckets = Record<Difficulty, WordEntry[]>;

export type LetterStatus = "pending" | "correct" | "present" | "absent";

export type GuessEvaluation = {
  letters: Array<{
    letter: string;
    status: LetterStatus;
  }>;
};
