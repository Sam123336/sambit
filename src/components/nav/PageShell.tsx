"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function PageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(
      el.children,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.55, stagger: 0.09, ease: "expo.out" },
    );
    return () => {
      tween.progress(1).kill();
    };
  }, []);

  return (
    <div ref={ref} className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">
        {eyebrow}
      </p>
      <h1 className="mb-10 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h1>
      {children}
    </div>
  );
}
