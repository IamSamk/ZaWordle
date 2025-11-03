"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const TRAIL_LETTERS = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_TRAIL_ITEMS = 14;
const ITEM_LIFETIME_MS = 520;
const MIN_TRAIL_INTERVAL_MS = 26;
const SPHERE_SIZE = 18;

type TrailItem = {
  id: number;
  x: number;
  y: number;
  letter: string;
};

type Pointer = {
  x: number;
  y: number;
};

export function CursorTrail() {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const counterRef = useRef(0);
  const mountedRef = useRef(true);
  const lastTrailRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pushTrailItem = useCallback((x: number, y: number) => {
    counterRef.current += 1;
    const id = counterRef.current;
    const letter = TRAIL_LETTERS[id % TRAIL_LETTERS.length];

    const item: TrailItem = { id, x, y, letter };

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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerUpdate = (event: PointerEvent) => {
      if (!mountedRef.current) {
        return;
      }

      const { clientX, clientY } = event;
      setPointer({ x: clientX, y: clientY });

      const now = performance.now();
      if (now - lastTrailRef.current >= MIN_TRAIL_INTERVAL_MS) {
        lastTrailRef.current = now;
        pushTrailItem(clientX, clientY);
      }
    };

    const passiveOptions: AddEventListenerOptions = { passive: true };

    window.addEventListener("pointermove", handlePointerUpdate, passiveOptions);
    window.addEventListener("pointerdown", handlePointerUpdate, passiveOptions);
    window.addEventListener("pointerenter", handlePointerUpdate, passiveOptions);

    return () => {
      window.removeEventListener("pointermove", handlePointerUpdate, passiveOptions);
      window.removeEventListener("pointerdown", handlePointerUpdate, passiveOptions);
      window.removeEventListener("pointerenter", handlePointerUpdate, passiveOptions);
    };
  }, [pushTrailItem]);

  if (!pointer && trail.length === 0) {
    return null;
  }

  const sphereStyle = pointer
    ? {
        transform: `translate(${pointer.x - SPHERE_SIZE / 2}px, ${pointer.y - SPHERE_SIZE / 2}px)`,
      }
    : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
      {pointer ? (
        <motion.div
          key="cursor-sphere"
          className="absolute h-[18px] w-[18px] rounded-full bg-[radial-gradient(circle_at_28%_30%,rgba(255,255,255,0.98)0%,rgba(255,255,255,0.82)35%,rgba(208,213,221,0.35)68%,rgba(125,211,252,0.35)90%,rgba(37,99,235,0.45)100%)] shadow-[0_0_28px_rgba(148,163,184,0.5)]"
          style={sphereStyle}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        />
      ) : null}
      <AnimatePresence>
        {trail.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 0, scale: 0.78, x: item.x, y: item.y }}
            animate={{ opacity: 0.9, scale: 1.1, x: item.x, y: item.y }}
            exit={{ opacity: 0, scale: 0.55 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute text-sm font-semibold uppercase tracking-[0.55rem] text-slate-100 drop-shadow-[0_4px_14px_rgba(148,163,184,0.45)]"
            style={{ translateX: -11, translateY: -11 }}
          >
            {item.letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
