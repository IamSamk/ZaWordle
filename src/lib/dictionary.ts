import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { DictionaryBuckets, Difficulty, WordEntry } from "./types";

const DATA_PATH = path.join(process.cwd(), "public", "data", "data.json");
const WORD_PATTERN = /^[a-z]{4,8}$/;

type RawMeaning = [string, string, unknown, unknown];

type RawEntry = {
  MEANINGS?: RawMeaning[];
  SYNONYMS?: string[];
  ANTONYMS?: string[];
};

type RankedWord = {
  word: string;
  definition: string;
  length: number;
  rank: number;
};

let cachedBuckets: DictionaryBuckets | null = null;
let cachedWordSet: Set<string> | null = null;

const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

const extractDefinition = (meanings?: RawMeaning[]): string | null => {
  if (!Array.isArray(meanings)) {
    return null;
  }

  for (const meaning of meanings) {
    if (!Array.isArray(meaning) || meaning.length < 2) {
      continue;
    }

    const candidate = meaning[1];
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeWhitespace(candidate).replaceAll("\"", "'");
    }
  }

  return null;
};

const computeRank = (word: string, definition: string, synonyms: string[]): number => {
  const lengthScore = word.length;
  const vowelCount = (word.match(/[aeiou]/g) ?? []).length;
  const vowelPenalty = Math.max(0, 2 - vowelCount) * 0.75;
  const rareLetterBonus = /[qxz]/.test(word) ? 1.5 : 0;
  const clusterBonus = /[^aeiou]{3}/.test(word) ? 0.6 : 0;
  const synonymComplexity = Math.min(1.5, synonyms.length * 0.2);
  const definitionComplexity = Math.min(2, definition.split(/\s+/).length / 14);

  return Number(
    (
      lengthScore +
      vowelPenalty +
      rareLetterBonus +
      clusterBonus +
      synonymComplexity +
      definitionComplexity
    ).toFixed(2),
  );
};

const quantile = (values: number[], percentile: number): number => {
  if (!values.length) {
    return Number.POSITIVE_INFINITY;
  }

  const index = Math.min(values.length - 1, Math.floor(values.length * percentile));
  return values[index];
};

const buildBuckets = (entries: RankedWord[]): DictionaryBuckets => {
  const easy: WordEntry[] = [];
  const medium: WordEntry[] = [];
  const hard: WordEntry[] = [];

  const fiveLetterRanks = entries
    .filter((entry) => entry.length === 5)
    .map((entry) => entry.rank)
    .sort((a, b) => a - b);

  const fiveLetterEasyCutoff = quantile(fiveLetterRanks, 0.35);

  const ordered = [...entries].sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word));

  for (const entry of ordered) {
    let difficulty: Difficulty;

    if (entry.length <= 4) {
      difficulty = "easy";
    } else if (entry.length === 5) {
      difficulty = entry.rank <= fiveLetterEasyCutoff ? "easy" : "medium";
    } else if (entry.length === 6) {
      difficulty = "hard";
    } else {
      difficulty = "hard";
    }

    const enriched: WordEntry = {
      word: entry.word,
      definition: entry.definition,
      length: entry.length,
      difficulty,
      rank: entry.rank,
    };

    if (difficulty === "easy") {
      easy.push(enriched);
    } else if (difficulty === "medium") {
      medium.push(enriched);
    } else {
      hard.push(enriched);
    }
  }

  const byRank = (a: WordEntry, b: WordEntry) => a.rank - b.rank || a.word.localeCompare(b.word);

  return {
    easy: easy.sort(byRank),
    medium: medium.sort(byRank),
    hard: hard.sort(byRank),
  };
};

const parseDataset = async (): Promise<RankedWord[]> => {
  const file = await fs.readFile(DATA_PATH, "utf8");
  const rawData = JSON.parse(file) as Record<string, RawEntry>;

  const entries: RankedWord[] = [];
  const seenWords = new Set<string>();

  for (const [rawWord, payload] of Object.entries(rawData)) {
    const word = rawWord.toLowerCase();

    if (!WORD_PATTERN.test(word) || seenWords.has(word)) {
      continue;
    }

    const definition = extractDefinition(payload.MEANINGS);
    if (!definition) {
      continue;
    }

    const synonyms = Array.isArray(payload.SYNONYMS)
      ? payload.SYNONYMS.filter((synonym) => /^[a-zA-Z]{3,}$/.test(synonym)).map((synonym) => synonym.toLowerCase())
      : [];

    const rank = computeRank(word, definition, synonyms);

    entries.push({
      word,
      definition,
      length: word.length,
      rank,
    });

    seenWords.add(word);
  }

  return entries;
};

export const loadDictionary = cache(async (): Promise<DictionaryBuckets> => {
  if (cachedBuckets) {
    return cachedBuckets;
  }

  const entries = await parseDataset();
  cachedBuckets = buildBuckets(entries);

  return cachedBuckets;
});

export const loadWordSet = cache(async (): Promise<Set<string>> => {
  if (cachedWordSet) {
    return cachedWordSet;
  }

  const buckets = await loadDictionary();
  cachedWordSet = new Set(
    [...buckets.easy, ...buckets.medium, ...buckets.hard].map(({ word }) => word),
  );

  return cachedWordSet;
});

export const pickRandomWord = (words: WordEntry[]): WordEntry => {
  if (!words.length) {
    throw new Error("No words available for the requested difficulty");
  }

  const index = Math.floor(Math.random() * words.length);
  return words[index];
};
