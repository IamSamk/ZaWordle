"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const TRAIL_LETTERS = "WORDLEOPABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_TRAIL_ITEMS = 16;
const ITEM_LIFETIME_MS = 520;
const MIN_TRAIL_INTERVAL_MS = 22;
const BIG_SPHERE_SIZE = 26;
const SMALL_SPHERE_SIZE = 8;

const HOVERABLE_SELECTOR = "a, button, [data-hoverable], [role='button'], input, select, textarea";

type TrailItem = {
  id: number;
  x: number;
  y: number;
  letter: string;
};

export function CursorTrail() {
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [pointerVisible, setPointerVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const bigPointerX = useMotionValue(-BIG_SPHERE_SIZE);
  const bigPointerY = useMotionValue(-BIG_SPHERE_SIZE);
  const smallPointerX = useMotionValue(-SMALL_SPHERE_SIZE);
  const smallPointerY = useMotionValue(-SMALL_SPHERE_SIZE);
  const bigSphereX = useSpring(bigPointerX, { stiffness: 320, damping: 34, mass: 0.6 });
  const bigSphereY = useSpring(bigPointerY, { stiffness: 320, damping: 34, mass: 0.6 });
  const smallSphereX = useSpring(smallPointerX, { stiffness: 620, damping: 28, mass: 0.3 });
  const smallSphereY = useSpring(smallPointerY, { stiffness: 620, damping: 28, mass: 0.3 });

  const mountedRef = useRef(false);
  const visibilityRef = useRef(false);
  const counterRef = useRef(0);
  const lastTrailRef = useRef(0);

  const hoverRef = useRef(false);

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
        const midX = window.innerWidth / 2;
        const midY = window.innerHeight / 2;
        bigPointerX.set(midX - BIG_SPHERE_SIZE / 2);
        bigPointerY.set(midY - BIG_SPHERE_SIZE / 2);
        smallPointerX.set(midX - SMALL_SPHERE_SIZE / 2);
        smallPointerY.set(midY - SMALL_SPHERE_SIZE / 2);
      });
    }

    const updatePointer = (event: PointerEvent | MouseEvent) => {
      if (!mountedRef.current) {
        return;
      }

      const { clientX, clientY } = event;
      bigPointerX.set(clientX - BIG_SPHERE_SIZE / 2);
      bigPointerY.set(clientY - BIG_SPHERE_SIZE / 2);
      smallPointerX.set(clientX - SMALL_SPHERE_SIZE / 2);
      smallPointerY.set(clientY - SMALL_SPHERE_SIZE / 2);

      if (!visibilityRef.current) {
        visibilityRef.current = true;
        setPointerVisible(true);
      }

      let shouldHover = false;
      const target = event.target;
      if (target instanceof Element) {
        shouldHover = Boolean(target.closest(HOVERABLE_SELECTOR));
      }
      if (hoverRef.current !== shouldHover) {
        hoverRef.current = shouldHover;
        setIsHovering(shouldHover);
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
      hoverRef.current = false;
      setIsHovering(false);
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
  }, [bigPointerX, bigPointerY, smallPointerX, smallPointerY, pushTrailItem]);

  if (!pointerVisible && trail.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      <AnimatePresence>
        {pointerVisible ? (
          <>
            <motion.div
              key="cursor-orb"
              className="absolute h-[26px] w-[26px] rounded-full bg-white mix-blend-screen"
              style={{ x: bigSphereX, y: bigSphereY, filter: "blur(0.25px)" }}
              initial={{ opacity: 0, scale: 0.6, boxShadow: "0 0 26px rgba(255,255,255,0.55)" }}
              animate={{
                opacity: 1,
                scale: isHovering ? 3.2 : 1,
                boxShadow: [
                  "0 0 22px rgba(255,255,255,0.4)",
                  "0 0 40px rgba(255,255,255,0.72)",
                  "0 0 22px rgba(255,255,255,0.4)",
                ],
              }}
              exit={{ opacity: 0, scale: 0.85, boxShadow: "0 0 10px rgba(255,255,255,0.2)" }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
                boxShadow: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              }}
            />
            <motion.div
              key="cursor-dot"
              className="absolute h-[8px] w-[8px] rounded-full bg-white/95 shadow-[0_0_18px_rgba(180,210,255,0.7)]"
              style={{ x: smallSphereX, y: smallSphereY }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            />
          </>
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
            className="absolute text-[0.72rem] font-semibold uppercase tracking-[0.58rem] text-slate-50/95 drop-shadow-[0_5px_16px_rgba(148,163,184,0.55)]"
            style={{ translateX: -10, translateY: -10 }}
          >
            {item.letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
