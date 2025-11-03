"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

type WordMarqueeProps = {
  words: string[];
  className?: string;
  itemClassName?: string;
};

const DUPLICATION_FACTOR = 2;

const buildSequence = (source: string[], offset: number, step: number, length: number): string[] => {
  if (source.length === 0) {
    return [];
  }

  const sequence: string[] = [];

  for (let index = 0; index < length; index += 1) {
    sequence.push(source[(offset + index * step) % source.length]);
  }

  return sequence;
};

export function WordMarquee({ words, className, itemClassName }: WordMarqueeProps) {
  const lanes = useMemo(() => {
    if (words.length === 0) {
      return [] as Array<{ key: string; className: string; entries: string[] }>;
    }

    const base = words.length > 40 ? words.slice(0, 40) : words;

    return [
      {
        key: "horizontal-primary",
        className: "word-marquee word-marquee--horizontal",
        entries: buildSequence(base, 0, 1, 28),
      },
      {
        key: "horizontal-secondary",
        className: "word-marquee word-marquee--horizontal word-marquee--reverse",
        entries: buildSequence(base, 7, 2, 28),
      },
      {
        key: "vertical",
        className: "word-marquee word-marquee--vertical",
        entries: buildSequence(base, 3, 1, 24),
      },
      {
        key: "diagonal",
        className: "word-marquee word-marquee--diagonal",
        entries: buildSequence(base, 12, 1, 32),
      },
      {
        key: "diagonal-alt",
        className: "word-marquee word-marquee--diagonal word-marquee--reverse",
        entries: buildSequence(base, 18, 2, 32),
      },
    ];
  }, [words]);

  if (lanes.length === 0) {
    return null;
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}>
      {lanes.map((lane) => (
        <div key={lane.key} className={cn(lane.className)}>
          {Array.from({ length: DUPLICATION_FACTOR }).map((_unused, duplication) =>
            lane.entries.map((word, index) => (
              <span
                key={`${lane.key}-${duplication}-${index}`}
                className={cn("word-marquee__item", itemClassName)}
              >
                {word}
              </span>
            )),
          )}
        </div>
      ))}
    </div>
  );
}
