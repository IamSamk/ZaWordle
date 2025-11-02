export type Difficulty = "easy" | "medium" | "hard";

export interface WordEntry {
  word: string;
  definition: string;
  difficulty: Difficulty;
}

export interface DictionaryBuckets {
  easy: WordEntry[];
  medium: WordEntry[];
  hard: WordEntry[];
  allWords: Set<string>;
}
