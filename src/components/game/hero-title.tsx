"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

const SPRING_CONFIG = { stiffness: 120, damping: 20, mass: 0.4 };

type HeroTitleProps = {
  text?: string;
  variant?: "hero" | "landing";
  className?: string;
};

export function HeroTitle({ text = "Wordle", variant = "hero", className }: HeroTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const sheen = useSpring(0, SPRING_CONFIG);

  const springX = useSpring(mouseX, SPRING_CONFIG);
  const springY = useSpring(mouseY, SPRING_CONFIG);
  const sheenStrength = useTransform(sheen, (value) => Math.max(0.18, value * 0.65));

  const config = useMemo(() => {
    if (variant === "landing") {
      return {
        maskRadius: 520,
        outerClass:
          "relative select-none text-center text-[clamp(6rem,18vw,14rem)] font-black uppercase tracking-[0.6rem] text-primary",
        gradient:
          "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(236,241,247,0.92) 22%, rgba(160,174,192,0.9) 55%, rgba(71,85,105,0.88) 82%), linear-gradient(220deg, rgba(59,130,246,0.55) 0%, rgba(16,185,129,0.45) 48%, rgba(14,165,233,0.5) 100%)",
        dropShadow: "drop-shadow(0 40px 70px rgba(14,165,233,0.45))",
      };
    }

    return {
      maskRadius: 360,
      outerClass:
        "relative select-none text-center text-5xl font-black uppercase tracking-[0.4rem] text-primary sm:text-6xl md:text-7xl",
      gradient:
        "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(229,231,235,0.88) 30%, rgba(148,163,184,0.85) 55%, rgba(51,65,85,0.82) 85%), linear-gradient(210deg, rgba(59,130,246,0.45) 0%, rgba(16,185,129,0.38) 45%, rgba(14,165,233,0.42) 100%)",
      dropShadow: "drop-shadow(0 28px 48px rgba(30, 64, 175, 0.35))",
    };
  }, [variant]);

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

  const glowMask = useMotionTemplate`radial-gradient(${config.maskRadius}px circle at ${springX}px ${springY}px, rgba(255,255,255,0.75), transparent 65%)`;
  const gloss = useMotionTemplate`linear-gradient(120deg, rgba(255,255,255,${sheenStrength}) 0%, rgba(255,255,255,0) 60%)`;

  return (
    <motion.h1
      ref={titleRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`${config.outerClass} ${config.dropShadow} ${className ?? ""}`.trim()}
      style={{
        backgroundImage: config.gradient,
        WebkitBackgroundClip: "text",
        color: "transparent",
        maskImage: glowMask,
        WebkitMaskImage: glowMask,
      }}
    >
      {text}
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
