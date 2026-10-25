"use client";

import { useEffect, useRef } from "react";

const SRC = "/portrait.jpg";
const GAP = 7; // portrait dot pitch (px)
const BG_GAP = 32; // matches .bg-grid so ambient dots sit on its line intersections
const MAX_R = GAP * 0.43;
const WIDE = 1024; // matches Tailwind lg: portrait sits right of the copy at this width and up
const REPEL_R = 120;
const SPRING = 0.05;
const DAMP = 0.84;
const STEP_MS = 1000 / 60;

type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; r: number; delay: number };

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function build(img: HTMLImageElement, w: number, h: number) {
  const side = w >= WIDE;
  const aspect = img.height / img.width;
  const pw = Math.min(side ? w * 0.4 : w * 0.9, (h * (side ? 0.92 : 0.7)) / aspect, 600);
  const ph = pw * aspect;
  const cols = Math.round(pw / GAP);
  const rows = Math.round(ph / GAP);
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  octx.drawImage(img, 0, 0, cols, rows);
  const px = octx.getImageData(0, 0, cols, rows).data;
  const ox = (side ? w * 0.76 : w / 2) - pw / 2;
  const oy = (h - ph) / 2;
  const reach = Math.max(w, h);

  const portrait: Dot[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // shortcut: assumes a greyscale source (red channel = luminance), swap for a luma calc if the photo changes
      const lum = px[(y * cols + x) * 4] / 255;
      const nx = ((x + 0.5) / cols) * 2 - 1;
      const ny = ((y + 0.5) / rows) * 2 - 1;
      const edge = 1 - smoothstep(0.6, 1, Math.hypot(nx, ny));
      // brightness → dot size; the floor keeps dark hair as fine dots instead of a hole
      const r = MAX_R * edge * (0.18 + 0.82 * smoothstep(0.1, 0.9, lum) ** 1.4);
      if (r < 0.45) continue;
      const hx = ox + ((x + 0.5) / cols) * pw;
      const hy = oy + ((y + 0.5) / rows) * ph;
      // each dot flies in from a random point out past the viewport edge
      const a = Math.random() * Math.PI * 2;
      const d = reach * (0.7 + Math.random() * 0.4);
      portrait.push({
        hx,
        hy,
        x: w / 2 + Math.cos(a) * d,
        y: h / 2 + Math.sin(a) * d,
        vx: 0,
        vy: 0,
        r,
        delay: Math.hypot(nx, ny) * 0.9 + Math.random() * 0.5,
      });
    }
  }

  const ambient: Dot[] = [];
  for (let y = 0; y <= h; y += BG_GAP) {
    for (let x = 0; x <= w; x += BG_GAP) {
      ambient.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, r: 1.1, delay: 0 });
    }
  }
  return { portrait, ambient };
}

/** Dotted portrait that assembles out of scattered particles when the preloader lifts, then reacts to the cursor. */
export default function DotPortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const img = new Image();
    let portrait: Dot[] = [];
    let ambient: Dot[] = [];
    let w = 0;
    let h = 0;
    let mx = -9999;
    let my = -9999;
    let startedAt = reduced ? -Infinity : 0; // 0 = waiting for the preloader to lift
    let live = reduced ? 1 : 0; // portrait dots flying (or settled) once their delay has passed
    let raf = 0;
    let last = 0;
    let acc = 0;

    const push = (d: Dot) => {
      let fx = (d.hx - d.x) * SPRING;
      let fy = (d.hy - d.y) * SPRING;
      const dx = d.x - mx;
      const dy = d.y - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < REPEL_R * REPEL_R && d2 > 0.01) {
        const dist = Math.sqrt(d2);
        const f = (1 - dist / REPEL_R) ** 2 * 5;
        fx += (dx / dist) * f;
        fy += (dy / dist) * f;
      }
      d.vx = (d.vx + fx) * DAMP;
      d.vy = (d.vy + fy) * DAMP;
      d.x += d.vx;
      d.y += d.vy;
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(232, 234, 240, 0.16)";
      ctx.beginPath();
      for (const d of ambient) {
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      }
      ctx.fill();

      const t = (now - startedAt) / 1000;
      const scan = (((now / 1000) % 9) / 9) * (h + 240) - 120; // beam sweeps top → bottom every 9s
      // stacked under the copy on narrow screens, so keep it a dim backdrop there
      ctx.fillStyle = w >= WIDE ? "rgba(56, 189, 248, 0.9)" : "rgba(56, 189, 248, 0.3)";
      ctx.beginPath();
      for (const d of portrait) {
        if (t < d.delay) continue;
        const g = (d.y - scan) / 42;
        const r = d.r * (1 + 0.9 * Math.exp(-g * g));
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      acc = Math.min(acc + (last ? now - last : 0), 50);
      last = now;
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        for (const d of ambient) push(d);
        if (startedAt) for (const d of portrait) if ((now - startedAt) / 1000 >= d.delay) push(d);
      }
      draw(now);
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ({ portrait, ambient } = build(img, w, h));
      // a resize after the assembly shouldn't replay it
      if (live) {
        for (const d of portrait) {
          d.x = d.hx;
          d.y = d.hy;
          d.delay = 0;
        }
      }
      if (reduced) draw(0);
    };

    const start = () => {
      startedAt = performance.now();
      live = 1;
    };
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      mx = e.clientX - b.left;
      my = e.clientY - b.top;
    };
    const onLeave = () => {
      mx = my = -9999;
    };

    // RO fires once on observe(); ignore it unless the size really changed, or it would snap the dots home
    const ro = new ResizeObserver(() => {
      const r = parent.getBoundingClientRect();
      if (r.width !== w || r.height !== h) resize();
    });
    img.onload = () => {
      resize();
      ro.observe(parent);
      if (reduced) return;
      if (sessionStorage.getItem("preloaded")) start();
      else window.addEventListener("preloader:lift", start, { once: true });
      raf = requestAnimationFrame(tick);
    };
    img.src = SRC;

    if (!reduced) {
      window.addEventListener("pointermove", onMove);
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      img.onload = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("preloader:lift", start);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
