"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const LINES = [
  { ok: true, text: "mounting postgres" },
  { ok: true, text: "warming redis cache" },
  { ok: true, text: "replicas in sync (3/3)" },
  { ok: true, text: "starting api gateway" },
  { ok: true, text: "autoscaler armed" },
  { ok: true, text: "health checks passing" },
  { ok: true, text: "bringing regions online" },
  { ok: false, text: "production healthy" },
];
const LINE_MS = 420;

/** Full-screen terminal boot intro: log lines → "production healthy" → slide away. Once per session; any key or click skips. */
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
    let finished = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];

    const logo = overlay.querySelector<HTMLElement>(".pl-logo");
    const term = overlay.querySelector<HTMLElement>(".pl-term");
    const bar = overlay.querySelector<HTMLElement>(".pl-bar");
    const lines = overlay.querySelectorAll<HTMLElement>(".pl-line");

    const finale = (hold: number) => {
      if (cancelled || finished) return;
      finished = true;
      if (interval) clearInterval(interval);
      const timeline = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("preloaded", "1");
          document.documentElement.style.overflow = "";
          setShow(false);
        },
      });
      timeline
        .to([term, logo], { opacity: 0, y: -8, duration: 0.3, ease: "power2.in" }, `+=${hold}`)
        .call(() => window.dispatchEvent(new Event("preloader:lift")), [], "+=0.1")
        .to(overlay, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "<");
      tweens.push(timeline);
    };

    const skip = () => {
      gsap.set(lines, { opacity: 1, x: 0 });
      finale(0.15);
    };

    // interval-driven so a dropped frame can delay a line but never swallow one
    const start = () => {
      if (cancelled) return;
      tweens.push(gsap.fromTo(logo, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }));
      if (bar) {
        tweens.push(
          gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: (LINES.length * LINE_MS) / 1000, ease: "none" }),
        );
      }
      let i = 0;
      const reveal = () => {
        tweens.push(gsap.fromTo(lines[i], { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.18, ease: "power2.out" }));
        i += 1;
      };
      reveal();
      interval = setInterval(() => {
        if (i < LINES.length) reveal();
        else finale(0.6);
      }, LINE_MS);
      window.addEventListener("keydown", skip, { once: true });
      window.addEventListener("pointerdown", skip, { once: true });
    };

    // wait for full page load so hydration jank can't eat the first lines
    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
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
        {/* plain img: next/image inside a GSAP-animated overlay adds no value here */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar.png"
          alt=""
          width={44}
          height={44}
          className="rounded-full border border-accent/50 shadow-[0_0_24px_var(--color-accent-glow)]"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-foreground-muted">
          backend · systems
        </span>
      </div>

      <div className="pl-term w-[min(88vw,24rem)] font-mono text-xs leading-7 md:text-sm">
        {LINES.map((l) => (
          <p key={l.text} className="pl-line opacity-0">
            <span className={l.ok ? "text-success" : "text-accent"}>{l.ok ? "[ OK ]" : ">"}</span>{" "}
            <span className={l.ok ? "text-foreground-muted" : "text-success"}>{l.text}</span>
            {!l.ok && <span className="animate-pulse text-accent"> _</span>}
          </p>
        ))}
      </div>

      <div className="absolute bottom-16 h-px w-48 bg-border md:w-64">
        <div className="pl-bar h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>
      <p className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground-muted/60">
        press any key to skip
      </p>
    </div>
  );
}
