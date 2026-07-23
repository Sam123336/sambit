"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { profile } from "@/data/profile";

const DIGITS = ["4", "3", "2", "1", "0"];
const SECONDS_PER_DIGIT = 1;

/** Full-screen countdown intro: logo → 4 3 2 1 0 → wordmark → slide away. Once per session. */
export default function Preloader() {
  const [show, setShow] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem("preloaded")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem("preloaded", "1");
      return;
    }
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!show) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    document.documentElement.style.overflow = "hidden";

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];

    const logo = overlay.querySelector<HTMLElement>(".pl-logo");
    const digit = overlay.querySelector<HTMLElement>(".pl-digit");
    const bar = overlay.querySelector<HTMLElement>(".pl-bar");
    const chars = overlay.querySelectorAll<HTMLElement>(".pl-char");
    const sub = overlay.querySelector<HTMLElement>(".pl-sub");

    const finale = () => {
      if (cancelled || !digit) return;
      const timeline = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("preloaded", "1");
          document.documentElement.style.overflow = "";
          setShow(false);
        },
      });
      timeline
        .to(digit, { scale: 0.6, opacity: 0, duration: 0.3, ease: "power3.in" })
        .to(logo, { opacity: 0, y: -8, duration: 0.25, ease: "power2.in" }, "<")
        .fromTo(
          chars,
          { opacity: 0, y: 26, rotateX: -50 },
          { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.028, ease: "expo.out" },
          "-=0.05",
        )
        .fromTo(sub, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.2")
        .to(overlay, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "+=0.55");
      tweens.push(timeline);
    };

    // interval-driven count: each digit simply SITS for a full second —
    // dropped frames can delay a swap but can never shorten one
    const start = () => {
      if (cancelled || !digit) return;
      tweens.push(gsap.fromTo(logo, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }));

      let i = 0;
      const showDigit = (d: string) => {
        digit.textContent = d;
        tweens.push(
          gsap.fromTo(digit, { scale: 1.12, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.25, ease: "power2.out" }),
        );
      };
      showDigit(DIGITS[0]);
      if (bar) {
        tweens.push(
          gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DIGITS.length * SECONDS_PER_DIGIT, ease: "none" }),
        );
      }
      interval = setInterval(() => {
        i += 1;
        if (i < DIGITS.length) {
          showDigit(DIGITS[i]);
        } else {
          clearInterval(interval);
          finale();
        }
      }, SECONDS_PER_DIGIT * 1000);
    };

    // wait for full page load so hydration jank can't eat the first digit
    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      if (interval) clearInterval(interval);
      tweens.forEach((t) => t.kill());
      document.documentElement.style.overflow = "";
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-bg"
      aria-hidden
    >
      {/* logo mark */}
      <div className="pl-logo mb-8 flex items-center gap-3 opacity-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/50 bg-accent/10 font-mono text-sm font-bold text-accent shadow-[0_0_20px_var(--color-accent-glow)]">
          S/G
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-foreground-muted">
          backend · systems
        </span>
      </div>

      {/* single-digit slot window */}
      <div className="relative flex h-[24vw] max-h-56 w-full items-center justify-center overflow-hidden">
        <span
          className="pl-digit font-mono text-[22vw] font-bold leading-none text-foreground md:text-[12rem]"
          style={{ opacity: 0 }}
        >
          4
        </span>
        {/* wordmark takes the stage after the count */}
        <div className="absolute flex flex-col items-center" style={{ perspective: 600 }}>
          <div className="flex">
            {profile.name.toUpperCase().split("").map((ch, i) => (
              <span
                key={i}
                className="pl-char inline-block font-mono text-3xl font-semibold tracking-wide opacity-0 md:text-5xl"
                style={{ whiteSpace: "pre" }}
              >
                {ch}
              </span>
            ))}
          </div>
          <p className="pl-sub mt-3 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-muted opacity-0 md:text-xs">
            Portfolio · breakable
          </p>
        </div>
      </div>

      <div className="absolute bottom-16 h-px w-48 bg-border md:w-64">
        <div className="pl-bar h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
