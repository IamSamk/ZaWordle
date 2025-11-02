"use client";

import { useCallback, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

const SPRING_CONFIG = { stiffness: 120, damping: 20, mass: 0.4 };

export function HeroTitle() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const sheen = useSpring(0, SPRING_CONFIG);

  const springX = useSpring(mouseX, SPRING_CONFIG);
  const springY = useSpring(mouseY, SPRING_CONFIG);
  const sheenStrength = useTransform(sheen, (value) => Math.max(0.15, value * 0.6));

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLHeadingElement>) => {
    const bounds = titleRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    mouseX.set(x);
    mouseY.set(y);
    sheen.set(1);
  }, [mouseX, mouseY, sheen]);

  const handlePointerLeave = useCallback(() => {
    sheen.set(0);
  }, [sheen]);

  const glowMask = useMotionTemplate`radial-gradient(350px circle at ${springX}px ${springY}px, rgba(255,255,255,0.7), transparent 65%)`;
  const gloss = useMotionTemplate`linear-gradient(120deg, rgba(255,255,255,${sheenStrength}) 0%, rgba(255,255,255,0) 60%)`;

  return (
    <motion.h1
      ref={titleRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
  className="relative select-none text-center text-5xl font-black uppercase tracking-[0.4rem] text-primary sm:text-6xl md:text-7xl"
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.1) 60%), linear-gradient(180deg, rgba(13,148,136,0.8) 0%, rgba(34,197,94,0.6) 50%, rgba(37,99,235,0.6) 100%)",
        WebkitBackgroundClip: "text",
        color: "transparent",
        filter: "drop-shadow(0 20px 35px rgba(14, 165, 233, 0.35))",
        maskImage: glowMask,
        WebkitMaskImage: glowMask,
      }}
    >
      Wordle
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: gloss,
          mixBlendMode: "screen",
          opacity: sheen,
        }}
      />
    </motion.h1>
  );
}
