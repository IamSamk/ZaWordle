"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CursorTrail } from "@/components/game/cursor-trail";
import { SakuraField } from "@/components/landing/sakura-field";

const CURATED_WORDS = [
  "AETHER",
  "BEACON",
  "BRIGHT",
  "CALMER",
  "CHERISH",
  "CLARITY",
  "COMFORT",
  "COURAGE",
  "CRYSTAL",
  "DAZZLE",
  "DELIGHT",
  "DISCERN",
  "DREAMER",
  "ELEGANT",
  "EMBLEM",
  "EMPATHY",
  "ENCHANT",
  "ENERGY",
  "ESSENCE",
  "ETHEREAL",
  "EVENING",
  "EVIDENT",
  "FASHION",
  "FESTIVE",
  "FLIGHT",
  "FLOWERS",
  "FONDLY",
  "GALAXY",
  "GARNET",
  "GENTLE",
  "GLOWING",
  "GOLDEN",
  "GRACEFUL",
  "HARMONY",
  "HEALER",
  "HEAVEN",
  "INSPIRE",
  "JASMINE",
  "JOURNEY",
  "KINDLE",
  "LAUREL",
  "LAVISH",
  "LILACS",
  "LUCENT",
  "LUMENS",
  "LUSTER",
  "MAGICAL",
  "MARVEL",
  "MEADOW",
  "MERCURY",
  "MIRAGE",
  "MOMENT",
  "MORNING",
  "MOSAIC",
  "NEBULA",
  "NIMBLE",
  "NOBLER",
  "NURTURE",
  "OASIS",
  "OCEANS",
  "ORACLE",
  "ORCHID",
  "OVERTURE",
  "PEARLS",
  "PLACID",
  "POLISH",
  "PURELY",
  "RADIANT",
  "REFINE",
  "REVIVE",
  "RHYTHM",
  "SERENE",
  "SHIMMER",
  "SILKEN",
  "SILVER",
  "SINCERE",
  "SKYLINE",
  "SOFTLY",
  "SOLACE",
  "SPARKLE",
  "SPRING",
  "STARRY",
  "SUMMER",
  "SUNBEAM",
  "SUPPLE",
  "SVELTE",
  "SWEETLY",
  "THRIVE",
  "TRANQUIL",
  "TWILIGHT",
  "UNITY",
  "UPLIFT",
  "VELVET",
  "VERDANT",
  "VIBRANT",
  "VISION",
  "WHISPER",
  "WILLOW",
  "WONDER",
  "ZEPHYR",
];

const createSeededGenerator = (seed: number) => {
  let state = seed | 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type LandingExperienceProps = {
  words: string[];
};

type FloatingWord = {
  id: string;
  word: string;
  left: number;
  top: number;
  translateX: number;
  translateY: number;
  duration: number;
  delay: number;
  opacity: number;
  scale: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const BLOCKED_WORDS = ["BREED", "BREEDER", "BREEDERS", "POTTY", "SCUM", "TRASH", "SLUR", "SWINE"];

export function LandingExperience({ words }: LandingExperienceProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const [hasPointer, setHasPointer] = useState(false);

  useEffect(() => {
    router.prefetch("/play");
  }, [router]);

  const sanitizedExtras = useMemo(() => {
    const seen = new Set(CURATED_WORDS);
    const extras: string[] = [];

    for (const entry of words) {
      const normalized = entry.toUpperCase();
      if (normalized.length < 4) {
        continue;
      }

      if (BLOCKED_WORDS.some((blocked) => normalized.includes(blocked))) {
        continue;
      }

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      extras.push(normalized);

      if (extras.length >= 50) {
        break;
      }
    }

    return extras;
  }, [words]);

  const floatingWords = useMemo(() => {
    const generator = createSeededGenerator(2025);
    const combined = CURATED_WORDS.concat(sanitizedExtras);

    if (!combined.length) {
      combined.push("WORDLE");
    }

    const shuffled = [...combined];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(generator() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const limit = Math.min(48, shuffled.length);

    return Array.from({ length: limit }).map((_, index) => {
      const word = shuffled[index % shuffled.length];
      const rand = createSeededGenerator(index * 137 + word.length * 41);
      const left = rand() * 100;
      const top = rand() * 100;
      const translateX = (rand() - 0.5) * 360;
      const translateY = (rand() - 0.5) * 360;
      const duration = 12 + rand() * 18;
      const delay = rand() * 8;
      const opacity = 0.16 + rand() * 0.24;
      const scale = 0.85 + rand() * 1.15;

      return {
        id: `${word}-${index}`,
        word,
        left,
        top,
        translateX,
        translateY,
        duration,
        delay,
        opacity,
        scale,
      } satisfies FloatingWord;
    });
  }, [sanitizedExtras]);

  const pointerVars = useMemo(
    () => ({
      "--pointer-x": `${pointer.x}%`,
      "--pointer-y": `${pointer.y}%`,
    }),
    [pointer],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasPointer) {
      setHasPointer(true);
    }

    const bounds = headingRef.current?.getBoundingClientRect();

    if (bounds) {
      const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100;
      setPointer({ x: clamp(relativeX, 0, 100), y: clamp(relativeY, 0, 100) });
      return;
    }

    setPointer({
      x: clamp((event.clientX / window.innerWidth) * 100, 0, 100),
      y: clamp((event.clientY / window.innerHeight) * 100, 0, 100),
    });
  }, [hasPointer]);

  const handlePointerLeave = useCallback(() => {
    setPointer({ x: 50, y: 50 });
  }, []);

  const handleStart = useCallback(() => {
    router.push("/play");
  }, [router]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <CursorTrail />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_65%,rgba(16,185,129,0.16),transparent_58%)]" />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,rgba(148,163,184,0.18),rgba(12,19,32,0.88))]"
      />

  <SakuraField className="pointer-events-none absolute inset-0 opacity-60" />

      <div className="pointer-events-none absolute inset-0">
        {floatingWords.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 0, scale: item.scale, x: 0, y: 0 }}
            animate={{ opacity: item.opacity, x: item.translateX, y: item.translateY }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="absolute select-none uppercase tracking-[0.58rem] text-slate-100/35 mix-blend-screen"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${1.15 * item.scale}rem`,
              textShadow: "0 12px 32px rgba(59,130,246,0.35)",
              filter: "blur(0.1px)",
            }}
          >
            {item.word}
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 pb-28 pt-36 text-center">
        <div className="flex w-full flex-col items-center gap-12">
          <motion.h1
            ref={headingRef}
            style={{
              ...pointerVars,
              backgroundImage: [
                "linear-gradient(170deg, rgba(250,252,255,0.98) 0%, rgba(230,236,244,0.92) 28%, rgba(166,180,198,0.78) 54%, rgba(56,66,87,0.82) 72%, rgba(18,26,46,0.9) 100%)",
                "linear-gradient(100deg, rgba(255,255,255,0.86) 0%, rgba(236,244,255,0.4) 35%, rgba(148,163,184,0.08) 55%, rgba(12,19,32,0.5) 80%)",
                "radial-gradient(240px 260px at var(--pointer-x) var(--pointer-y), rgba(255,255,255,0.98) 0%, rgba(226,232,240,0.6) 32%, rgba(148,163,184,0.1) 70%, rgba(15,23,42,0.05) 85%, transparent 100%)",
                "linear-gradient(180deg, rgba(246,249,255,0.75) 0%, rgba(226,232,240,0.6) 34%, rgba(28,42,64,0.78) 52%, rgba(15,21,34,0.92) 58%, rgba(70,82,108,0.4) 82%, rgba(220,228,240,0.78) 100%)",
              ].join(","),
              backgroundBlendMode: "screen, soft-light, screen, multiply",
              WebkitBackgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 48px 95px rgba(30, 64, 175, 0.55))",
            }}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="select-none text-[clamp(6rem,18vw,15rem)] font-black uppercase tracking-[0.9rem]"
          >
            WORDLE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="max-w-3xl text-lg text-slate-200/80"
          >
            Glide into a cinematic word puzzle. Sweep the cursor across the metallic title and watch it shimmer while curated words orbit the stage. When you&apos;re ready, dive into streak-chasing gameplay.
          </motion.p>

          <motion.button
            type="button"
            onClick={handleStart}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.32 }}
            className="group relative overflow-hidden rounded-full border border-slate-200/40 bg-slate-100/10 px-12 py-4 text-sm font-semibold uppercase tracking-[0.45rem] text-slate-100 shadow-[0_24px_80px_-30px_rgba(59,130,246,0.65)] backdrop-blur hover:-translate-y-1 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          >
            <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(163,230,53,0.4),rgba(56,189,248,0.5),rgba(14,165,233,0.4))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            Start Game
          </motion.button>
        </div>
      </div>
    </div>
  );
}
