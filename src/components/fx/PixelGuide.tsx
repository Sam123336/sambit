"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PixelMe, { FRAME } from "./PixelMe";

const LINES: Record<string, string> = {
  "/": "Hi — I'm Sambit. Nothing here is a slideshow. Start with the playground.",
  "/play": "Place components on the canvas. Every number you see is computed from what you built.",
  "/work": "Four problems and what actually fixed them. The blurred pair at the bottom — rub those.",
  "/experience": "Where I've shipped, and what it cost to learn.",
  "/about": "The short version of me, minus the buzzwords.",
  "/resume": "One page. Take it with you if you're hiring.",
  "/contact": "Email is the fastest way to reach me. I read everything.",
};
const FALLBACK = "Wander anywhere — nothing here is a dead end.";

const IDLE_MUSINGS = [
  "Just checking the logs.",
  "Coffee. Then the next bug.",
  "This canvas runs the real numbers, by the way.",
  "Stretching my legs.",
  "Ask me anything — well, email me anything.",
];
const SNOOP_LINES = [
  "Hey! That one isn't finished!",
  "Caught you. Mail me and I'll just tell you.",
  "You found the unreleased one. Respect.",
];

const STORAGE_KEY = "pixel-guide-dismissed";
const SNOOP_EVENT = "guide:snoop";
/** Tested separately: the body needs a gap to stand in, the bubble needs a bigger one. */
const SPRITE = { w: 52, h: 88 };
const BUBBLE = { w: 224, h: 78 };
const GROUND = 8; // matches bottom-2
/** Anything worth reading or clicking — the guide refuses to stand on these. */
const CONTENT =
  "p,h1,h2,h3,h4,li,img,figure,figcaption,button,a,input,textarea,select,canvas,code,pre,summary,dd,dt";

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

type Mode = "walk" | "idle" | "coffee" | "work" | "cheer";

export default function PixelGuide() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [frame, setFrame] = useState<number>(FRAME.stand);
  const [x, setX] = useState(400);
  const [walkMs, setWalkMs] = useState(900);
  const [facing, setFacing] = useState(1);
  const [crowded, setCrowded] = useState(false); // nowhere clear: shrink to just the sprite
  const [override, setOverride] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOverride(null);
  }
  const line = override ?? LINES[pathname] ?? FALLBACK;

  const rootRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(400);
  const cursorX = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stepper = useRef<ReturnType<typeof setInterval> | null>(null);
  const roamRef = useRef<() => void>(() => {});

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (stepper.current) clearInterval(stepper.current);
    stepper.current = null;
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const cycle = (frames: number[], ms: number) => {
    if (stepper.current) clearInterval(stepper.current);
    let i = 0;
    setFrame(frames[0]);
    stepper.current = setInterval(() => {
      i = (i + 1) % frames.length;
      setFrame(frames[i]);
    }, ms);
  };

  const roamBounds = () => {
    const w = window.innerWidth;
    // out to the right gutter, which is usually the only truly empty strip
    return { min: Math.round(Math.max(w * 0.26, 236)), max: Math.round(w - BUBBLE.w - 24) };
  };

  /** Sample a box for anything readable or clickable sitting under it. */
  const hitsContent = useCallback((l: number, t: number, w: number, h: number) => {
    const root = rootRef.current;
    for (const px of [l + 6, l + w / 2, l + w - 6]) {
      if (px < 4 || px > window.innerWidth - 4) continue;
      for (const py of [t + 6, t + h / 2, t + h - 6]) {
        if (py < 4 || py > window.innerHeight - 4) continue;
        for (const hit of document.elementsFromPoint(px, py)) {
          if (root?.contains(hit)) continue;
          if (hit.matches(CONTENT)) return true;
        }
      }
    }
    return false;
  }, []);

  // the sprite is centred under the bubble, so it sits inset from the container's left
  const bodyBlocked = useCallback(
    (leftPx: number) =>
      hitsContent(
        leftPx + (BUBBLE.w - SPRITE.w) / 2,
        window.innerHeight - GROUND - SPRITE.h,
        SPRITE.w,
        SPRITE.h,
      ),
    [hitsContent],
  );

  const bubbleBlocked = useCallback(
    (leftPx: number) =>
      hitsContent(
        leftPx,
        window.innerHeight - GROUND - SPRITE.h - 4 - BUBBLE.h,
        BUBBLE.w,
        BUBBLE.h,
      ),
    [hitsContent],
  );

  /** A spot where the body isn't standing on content; null if the strip is full. */
  const findClearSpot = useCallback(() => {
    const { min, max } = roamBounds();
    let fallback: number | null = null;
    for (let i = 0; i < 12; i++) {
      const candidate = Math.round(min + Math.random() * (max - min));
      if (bodyBlocked(candidate)) continue;
      if (!bubbleBlocked(candidate)) return candidate; // room to speak too
      fallback ??= candidate;
    }
    return fallback;
  }, [bodyBlocked, bubbleBlocked]);

  const walkTo = useCallback((target: number, onArrive: () => void, fast = false) => {
    const from = xRef.current;
    const distance = Math.abs(target - from);
    const ms = Math.min(fast ? 900 : 2200, Math.max(fast ? 260 : 450, distance * (fast ? 3 : 7)));

    setFacing(target >= from ? 1 : -1);
    setWalkMs(ms);
    xRef.current = target;
    setX(target);
    setMode("walk");
    cycle([FRAME.walk, FRAME.stand], fast ? 110 : 150);

    later(() => {
      if (stepper.current) clearInterval(stepper.current);
      stepper.current = null;
      setFrame(FRAME.stand);
      onArrive();
    }, ms);
  }, []);

  /** Settle into an activity wherever it just landed. */
  const settle = useCallback(() => {
    const roll = Math.random();
    if (roll < 0.35) {
      setMode("coffee");
      cycle([FRAME.coffee, FRAME.coffee, FRAME.sip, FRAME.sip], 620); // lift, drink, lower
    } else if (roll < 0.65) {
      setMode("work");
      cycle([FRAME.typeA, FRAME.typeB], 190); // hands shuffling on the keys
    } else {
      setMode("idle");
      setFrame(FRAME.stand);
    }
    if (Math.random() < 0.5) setOverride(pick(IDLE_MUSINGS));
  }, []);

  const roam = useCallback(() => {
    const spot = findClearSpot();
    const { min, max } = roamBounds();
    const target = spot ?? Math.round(min + Math.random() * (max - min));

    walkTo(target, () => {
      setCrowded(bubbleBlocked(target)); // speak only if the bubble has room
      settle();
      later(() => roamRef.current(), 5000 + Math.random() * 7000);
    });
  }, [walkTo, settle, findClearSpot, bubbleBlocked]);

  useEffect(() => {
    roamRef.current = roam;
  }, [roam]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      setDismissed(false);
      setReady(true);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (dismissed || !ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    clearAll();
    later(roam, 300); // let the new page paint before measuring what's underneath
    return clearAll;
  }, [pathname, dismissed, ready, roam, clearAll]);

  // scrolling slides content under it — get out of the way when that happens
  useEffect(() => {
    if (dismissed || !ready) return;
    if (mode === "walk" || mode === "cheer") return;

    let queued = false;
    const check = () => {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        // content slid under the body — bolt for a clear spot
        if (bodyBlocked(xRef.current)) {
          const spot = findClearSpot();
          if (spot !== null) {
            clearAll();
            walkTo(
              spot,
              () => {
                setCrowded(bubbleBlocked(spot));
                settle();
                later(() => roamRef.current(), 5000);
              },
              true, // hurry
            );
            return;
          }
        }
        setCrowded(bubbleBlocked(xRef.current)); // otherwise just stop talking over it
      }, 260);
    };

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [dismissed, ready, mode, bodyBlocked, bubbleBlocked, findClearSpot, walkTo, settle, clearAll]);

  // turn to watch the cursor, but only while standing still
  useEffect(() => {
    if (dismissed || !ready) return;
    if (mode === "walk" || mode === "cheer") return;

    const onMove = (e: PointerEvent) => {
      cursorX.current = e.clientX;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const watch = setInterval(() => {
      setFacing(cursorX.current >= xRef.current + 24 ? 1 : -1);
    }, 400);

    return () => {
      window.removeEventListener("pointermove", onMove);
      clearInterval(watch);
    };
  }, [dismissed, ready, mode]);

  useEffect(() => {
    if (dismissed || !ready) return;
    const onSnoop = () => {
      clearAll();
      setMode("cheer");
      setFrame(FRAME.cheer);
      setOverride(pick(SNOOP_LINES));
      later(() => {
        setMode("idle");
        setFrame(FRAME.stand);
        later(() => roamRef.current(), 3000);
      }, 2600);
    };
    window.addEventListener(SNOOP_EVENT, onSnoop);
    return () => window.removeEventListener(SNOOP_EVENT, onSnoop);
  }, [dismissed, ready, clearAll]);

  if (dismissed || !ready) return null;

  const bubbleHidden = mode === "walk" || crowded;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed bottom-2 left-0 z-30 hidden flex-col items-center sm:flex"
      style={{ translate: `${x}px 0`, transition: `translate ${walkMs}ms ease-in-out` }}
    >
      <div
        className={`pointer-events-auto mb-1 max-w-[14rem] rounded-lg border border-border bg-surface/95 px-3 py-2 text-center backdrop-blur transition-opacity duration-300 ${
          bubbleHidden ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-[11px] leading-snug text-foreground-muted">{line}</p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(STORAGE_KEY, "1");
            setDismissed(true);
          }}
          className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-foreground-muted/60 hover:text-accent"
        >
          leave me alone
        </button>
      </div>

      {/* nowhere clear to stand: go translucent rather than sit on top of the text */}
      <span
        style={{ transform: `scaleX(${facing})` }}
        className={`block transition-opacity duration-500 ${crowded ? "opacity-40" : "opacity-100"}`}
      >
        <span className={`block ${mode === "cheer" ? "guide-hop" : ""}`}>
          <PixelMe frame={frame} height={84} />
        </span>
      </span>
    </div>
  );
}
