"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// ponytail: single-hue wash only — multi-color blobs read as generic AI gradient
const BLOBS = [
  { size: 560, color: "rgba(56, 189, 248, 0.16)", top: "-14%", left: "4%" },
  { size: 420, color: "rgba(56, 189, 248, 0.07)", top: "55%", left: "68%" },
];

/** Slow-drifting blurred glow orbs behind content. Purely decorative. */
export default function AmbientBlobs() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blobs = ref.current?.children;
    if (!blobs) return;
    const tweens = Array.from(blobs).map((el, i) =>
      gsap.to(el, {
        x: i % 2 === 0 ? 60 : -50,
        y: i % 2 === 0 ? -40 : 50,
        duration: 14 + i * 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      }),
    );
    return () => tweens.forEach((t) => t.kill());
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
