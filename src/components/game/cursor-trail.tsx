"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const TRAIL_LETTERS = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_TRAIL_ITEMS = 18;
const ITEM_LIFETIME_MS = 580;
const MIN_TRAIL_INTERVAL_MS = 22;
const SPHERE_SIZE = 22;

type TrailItem = {
  id: number;
  x: number;
  y: number;
  letter: string;
};

export function CursorTrail() {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [pointerVisible, setPointerVisible] = useState(false);
  const pointerX = useMotionValue(-SPHERE_SIZE);
  const pointerY = useMotionValue(-SPHERE_SIZE);
  const sphereX = useSpring(pointerX, { stiffness: 360, damping: 32, mass: 0.55 });
  const sphereY = useSpring(pointerY, { stiffness: 360, damping: 32, mass: 0.55 });

  const mountedRef = useRef(false);
  const visibilityRef = useRef(false);
  const counterRef = useRef(0);
  const lastTrailRef = useRef(0);

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
    mountedRef.current = true;

    let frame: number | null = null;

    if (typeof window !== "undefined") {
      frame = window.requestAnimationFrame(() => {
        pointerX.set(window.innerWidth / 2 - SPHERE_SIZE / 2);
        pointerY.set(window.innerHeight / 2 - SPHERE_SIZE / 2);
      });
    }

    const updatePointer = (event: PointerEvent | MouseEvent) => {
      if (!mountedRef.current) {
        return;
      }

      const { clientX, clientY } = event;
      pointerX.set(clientX - SPHERE_SIZE / 2);
      pointerY.set(clientY - SPHERE_SIZE / 2);

      if (!visibilityRef.current) {
        visibilityRef.current = true;
        setPointerVisible(true);
      }

      const now = performance.now();
      if (now - lastTrailRef.current >= MIN_TRAIL_INTERVAL_MS) {
        lastTrailRef.current = now;
        pushTrailItem(clientX, clientY);
      }
    };

    const handleLeave = () => {
      if (!visibilityRef.current) {
        return;
      }

      visibilityRef.current = false;
      setPointerVisible(false);
      setTrail([]);
    };

    const options: AddEventListenerOptions = { passive: true };

    document.addEventListener("pointermove", updatePointer, options);
    document.addEventListener("mousemove", updatePointer, options);
    document.addEventListener("pointerdown", updatePointer, options);
    document.addEventListener("pointerenter", updatePointer, options);
    document.addEventListener("pointerleave", handleLeave, options);
    document.addEventListener("mouseleave", handleLeave, options);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      document.removeEventListener("pointermove", updatePointer, options);
      document.removeEventListener("mousemove", updatePointer, options);
      document.removeEventListener("pointerdown", updatePointer, options);
      document.removeEventListener("pointerenter", updatePointer, options);
      document.removeEventListener("pointerleave", handleLeave, options);
      document.removeEventListener("mouseleave", handleLeave, options);

      visibilityRef.current = false;
      mountedRef.current = false;
    };
  }, [pointerX, pointerY, pushTrailItem]);

  if (!pointerVisible && trail.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      <AnimatePresence>
        {pointerVisible ? (
          <motion.div
            key="cursor-orb"
            className="absolute h-[22px] w-[22px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,1)0%,rgba(255,255,255,0.92)32%,rgba(226,232,240,0.75)58%,rgba(147,197,253,0.65)78%,rgba(37,99,235,0.45)100%)] shadow-[0_0_36px_rgba(180,200,255,0.65)] ring-2 ring-white/70 mix-blend-screen"
            style={{ x: sphereX, y: sphereY, filter: "brightness(1.25) saturate(1.35)" }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <span className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)0%,transparent 70%)] blur-[6px] opacity-80" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {trail.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 0, scale: 0.8, x: item.x, y: item.y }}
            animate={{ opacity: 0.95, scale: 1.12, x: item.x, y: item.y }}
            exit={{ opacity: 0, scale: 0.55 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute text-sm font-semibold uppercase tracking-[0.6rem] text-slate-50 drop-shadow-[0_6px_18px_rgba(148,163,184,0.6)]"
            style={{ translateX: -12, translateY: -12 }}
          >
            {item.letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
