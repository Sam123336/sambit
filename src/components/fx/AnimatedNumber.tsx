"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Tweens displayed value toward `value` instead of snapping. */
export default function AnimatedNumber({
  value,
  format = (v: number) => Math.round(v).toString(),
}: {
  value: number;
  format?: (v: number) => string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ v: value });

  useEffect(() => {
    const span = spanRef.current;
    if (!span) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.current.v = value;
      span.textContent = format(value);
      return;
    }
    const tween = gsap.to(state.current, {
      v: value,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        span.textContent = format(state.current.v);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, format]);

  return <span ref={spanRef}>{format(value)}</span>;
}
