"use client";

import { AnimatePresence, motion, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const TRAIL_LETTERS = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_TRAIL_ITEMS = 10;
const ITEM_LIFETIME_MS = 440;
const SPRING_CONFIG = { stiffness: 260, damping: 28, mass: 0.35 };

type TrailItem = {
  id: number;
  x: number;
  y: number;
  letter: string;
};

export function CursorTrail() {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [hasPointer, setHasPointer] = useState(false);
  const counterRef = useRef(0);
  const mountedRef = useRef(true);
  const springX = useSpring(0, SPRING_CONFIG);
  const springY = useSpring(0, SPRING_CONFIG);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      springX.set(event.clientX);
      springY.set(event.clientY);
      if (!hasPointer) {
        setHasPointer(true);
      }

      counterRef.current += 1;
      const id = counterRef.current;
      const letter = TRAIL_LETTERS[id % TRAIL_LETTERS.length];

      const item: TrailItem = {
        id,
        x: event.clientX,
        y: event.clientY,
        letter,
      };

      setTrail((previous) => {
        const next = [...previous, item];
        return next.slice(-MAX_TRAIL_ITEMS);
      });

      window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        setTrail((previous) => previous.filter((entry) => entry.id !== id));
      }, ITEM_LIFETIME_MS);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [hasPointer, springX, springY]);

  if (!hasPointer && trail.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
      {hasPointer ? (
        <motion.div
          className="pointer-events-none absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(125,211,252,0.85)45%,rgba(59,130,246,0.6)75%,rgba(14,165,233,0.3))] mix-blend-screen shadow-[0_0_45px_rgba(56,189,248,0.55)]"
          style={{ x: springX, y: springY, filter: "blur(0.2px)" }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      ) : null}
      <AnimatePresence>
        {trail.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 0, scale: 0.85, x: item.x, y: item.y }}
            animate={{ opacity: 0.9, scale: 1.22, x: item.x, y: item.y }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute text-sm font-semibold uppercase tracking-[0.6rem] text-cyan-100 drop-shadow-[0_6px_18px_rgba(56,189,248,0.45)]"
            style={{ translateX: -14, translateY: -14 }}
          >
            {item.letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
