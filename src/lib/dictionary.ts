import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { cache } from "react";

import type { DictionaryBuckets, Difficulty, WordEntry } from "./types";

const DICTIONARY_PATH = path.join(process.cwd(), "public", "data", "dict.csv");

const MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 8;

const alphaRegex = /^[a-z]{4,}$/;

const categorizeByLength = (length: number): Difficulty | null => {
  if (length >= MIN_WORD_LENGTH && length <= 5) {
    return "easy";
  }

  if (length === 6) {
    return "medium";
  }

  if (length >= 7 && length <= MAX_WORD_LENGTH) {
    return "hard";
  }

  return null;
};

type RawWord = {
  word?: string;
  definition?: string;
};

const parseCsv = (input: string): Papa.ParseResult<RawWord> =>
  Papa.parse<RawWord>(input, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

let cachedBuckets: DictionaryBuckets | null = null;
let cachedWordSet: Set<string> | null = null;

const buildBuckets = (rows: RawWord[]): DictionaryBuckets => {
  const buckets: DictionaryBuckets = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const row of rows) {
    const rawWord = row.word?.trim();
    const rawDefinition = row.definition?.trim();

    if (!rawWord || !rawDefinition) {
      continue;
    }

    const word = rawWord.toLowerCase();

    if (!alphaRegex.test(word)) {
      continue;
    }

    const length = word.length;
    const difficulty = categorizeByLength(length);

    if (!difficulty) {
      continue;
    }

    buckets[difficulty].push({
      word,
      definition: rawDefinition,
      length,
      difficulty,
    });
  }

  return {
    easy: buckets.easy.sort((a, b) => a.word.localeCompare(b.word)),
    medium: buckets.medium.sort((a, b) => a.word.localeCompare(b.word)),
    hard: buckets.hard.sort((a, b) => a.word.localeCompare(b.word)),
  };
};

export const loadDictionary = cache(async (): Promise<DictionaryBuckets> => {
  if (cachedBuckets) {
    return cachedBuckets;
  }

  const file = await fs.readFile(DICTIONARY_PATH, "utf8");
  const result = parseCsv(file);

  if (result.errors.length) {
    const message = result.errors.map((error) => error.message).join(", ");
    throw new Error(`Failed to parse dict.csv: ${message}`);
  }

  cachedBuckets = buildBuckets(result.data);
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
