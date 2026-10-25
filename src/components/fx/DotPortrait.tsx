"use client";

import { useEffect, useRef } from "react";

const SRC = "/portrait.jpg";
const GAP = 7; // portrait dot pitch (px)
const BG_GAP = 32; // matches .bg-grid so ambient dots sit on its line intersections
const MAX_R = GAP * 0.43;
const REPEL_R = 120;
const SPRING = 0.05;
const DAMP = 0.84;
const STEP_MS = 1000 / 60;
const WIDE = 1024; // matches Tailwind lg: portrait sits right of the copy at this width and up
const GLOBE_S = 3.2; // seconds the dots hold the globe before melting into the portrait
const SPIN = 0.006; // globe rotation per physics step (rad)
const TILT = 0.35;
const CT = Math.cos(TILT);
const ST = Math.sin(TILT);
const GLOBE_R = 1.3; // dot radius on the globe
const LINK_R = 110; // the cursor lights the grid mesh inside this radius
const BOOM_R = 320; // a click shatters the dots inside this radius

// regions the globe fires requests between: Mumbai, Singapore, Frankfurt, Virginia, São Paulo, Sydney
const HUBS = [
  [19, 73],
  [1, 104],
  [50, 9],
  [38, -77],
  [-23, -46],
  [-34, 151],
].map(([la, lo]) => {
  const p = (la * Math.PI) / 180;
  const l = (lo * Math.PI) / 180;
  return [Math.cos(p) * Math.sin(l), -Math.sin(p), Math.cos(p) * Math.cos(l)];
});
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 3],
  [1, 5],
];
// arc control points: the midpoint pushed out past the sphere so the curve lifts off it
const LIFTS = LINKS.map(([i, j]) => {
  const v = HUBS[i].map((c, n) => c + HUBS[j][n]);
  const l = Math.hypot(...v) || 1;
  return v.map((c) => (c / l) * 1.7);
});

type Dot = {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  delay: number; // when the dot starts flying in
  mdelay: number; // when it leaves the globe for its portrait spot
  sx: number; // unit-sphere position
  sy: number;
  sz: number;
  z: number; // depth while on the globe: <0 is the far side
  k: number; // 0 = globe-sized, 1 = portrait-sized
  h: number; // ripple height (ambient dots)
};

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const dot = (hx: number, hy: number, r: number): Dot => ({
  hx,
  hy,
  x: hx,
  y: hy,
  vx: 0,
  vy: 0,
  r,
  delay: 0,
  mdelay: 0,
  sx: 0,
  sy: 0,
  sz: 0,
  z: 1,
  k: 1,
  h: 0,
});

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
      const d = dot(ox + ((x + 0.5) / cols) * pw, oy + ((y + 0.5) / rows) * ph, r);
      // each dot flies in from a random point out past the viewport edge
      const a = Math.random() * Math.PI * 2;
      const away = reach * (0.7 + Math.random() * 0.4);
      d.x = w / 2 + Math.cos(a) * away;
      d.y = h / 2 + Math.sin(a) * away;
      const dist = Math.hypot(nx, ny);
      d.delay = dist * 0.9 + Math.random() * 0.5;
      d.mdelay = dist * 0.8 + Math.random() * 0.2;
      d.k = 0;
      portrait.push(d);
    }
  }
  // top-to-bottom order on both sides, so the globe flattens into the face instead of scrambling
  portrait.sort((a, b) => a.hy - b.hy);
  portrait.forEach((d, i) => {
    const sy = -1 + (2 * (i + 0.5)) / portrait.length;
    const rr = Math.sqrt(1 - sy * sy);
    d.sx = Math.cos(i * 2.39996) * rr;
    d.sy = sy;
    d.sz = Math.sin(i * 2.39996) * rr;
  });

  const gridCols = Math.floor(w / BG_GAP) + 1;
  const ambient: Dot[] = [];
  for (let y = 0; y <= h; y += BG_GAP) {
    for (let x = 0; x <= w; x += BG_GAP) ambient.push(dot(x, y, 1.1));
  }
  return { portrait, ambient, gridCols, globe: { cx: ox + pw / 2, cy: oy + ph / 2, R: Math.min(pw, ph) * 0.46 } };
}

/**
 * Hero dot canvas. Once the preloader lifts the dots assemble into a spinning globe (requests
 * arcing between regions), melt into a dotted portrait, then play: the cursor lights the grid
 * mesh, clicks shatter the face, send packets through the mesh and ripple the grid.
 */
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
    let gridCols = 0;
    let globe = { cx: 0, cy: 0, R: 0 };
    const ripples: { x: number; y: number; t: number }[] = [];
    const packets: { i: number; j: number; u: number; hop: number }[] = [];
    let w = 0;
    let h = 0;
    let mx = -9999;
    let my = -9999;
    let live = reduced; // false until the preloader lifts
    let startedAt = reduced ? -Infinity : 0;
    let ang = 0;
    let ca = 1;
    let sa = 0;
    let raf = 0;
    let last = 0;
    let acc = 0;

    const push = (d: Dot, tx: number, ty: number) => {
      let fx = (tx - d.x) * SPRING;
      let fy = (ty - d.y) * SPRING;
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

    // neighbour on the 32px grid, or -1 off the edge
    const neighbour = (i: number) => {
      const c = [i + 1, i - 1, i + gridCols, i - gridCols][Math.floor(Math.random() * 4)];
      const sameRow = Math.abs(c - i) !== 1 || Math.floor(c / gridCols) === Math.floor(i / gridCols);
      return sameRow && c >= 0 && c < ambient.length ? c : -1;
    };
    const send = (i: number, hop = 0) => {
      const j = neighbour(i);
      if (j >= 0 && packets.length < 40) packets.push({ i, j, u: 0, hop });
    };

    const simulate = (now: number) => {
      ang += SPIN;
      ca = Math.cos(ang);
      sa = Math.sin(ang);
      for (const d of ambient) push(d, d.hx, d.hy);
      if (!live) return;
      const ts = (now - startedAt) / 1000;
      for (const d of portrait) {
        if (ts < d.delay) continue;
        if (ts < GLOBE_S + d.mdelay) {
          const X = d.sx * ca + d.sz * sa;
          const Z = -d.sx * sa + d.sz * ca;
          d.z = d.sy * ST + Z * CT;
          push(d, globe.cx + X * globe.R, globe.cy + (d.sy * CT - Z * ST) * globe.R);
        } else {
          d.z = 1;
          d.k = Math.min(1, d.k + 0.04);
          push(d, d.hx, d.hy);
        }
      }
      for (let n = packets.length - 1; n >= 0; n--) {
        const p = packets[n];
        p.u += 0.07;
        if (p.u < 1) continue;
        packets.splice(n, 1);
        if (p.hop < 14 && Math.random() < 0.85) send(p.j, p.hop + 1);
      }
    };

    const proj = (v: number[]) => {
      const X = v[0] * ca + v[2] * sa;
      const Z = -v[0] * sa + v[2] * ca;
      return [globe.cx + X * globe.R, globe.cy + (v[1] * CT - Z * ST) * globe.R, v[1] * ST + Z * CT];
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const ts = live ? (now - startedAt) / 1000 : -1;
      const dim = w >= WIDE ? 1 : 0.35; // stacked under the copy on narrow screens, so keep it a backdrop there
      while (ripples.length && t - ripples[0].t > 3.5) ripples.shift();

      // grid dots: a soft wave follows the cursor, clicks send rings across
      ctx.fillStyle = "rgba(232, 234, 240, 0.16)";
      ctx.beginPath();
      for (const d of ambient) {
        let hh = 0;
        if (mx > -999) {
          const dm = Math.hypot(d.x - mx, d.y - my);
          hh += 6 * Math.sin(dm * 0.09 - t * 5) * Math.exp(-dm / 90);
        }
        for (const rp of ripples) {
          const age = t - rp.t;
          const dr = Math.hypot(d.x - rp.x, d.y - rp.y);
          hh += 14 * Math.sin(dr * 0.07 - age * 7) * Math.exp(-dr / 160 - age * 1.1);
        }
        d.h = hh;
        const r = d.r * (1 + Math.max(0, hh) * 0.08);
        ctx.moveTo(d.x + r, d.y - hh);
        ctx.arc(d.x, d.y - hh, r, 0, Math.PI * 2);
      }
      ctx.fill();

      // cursor lights the mesh between nearby grid dots
      if (mx > -999) {
        ctx.lineWidth = 1;
        const c0 = Math.max(0, Math.floor((mx - LINK_R) / BG_GAP));
        const c1 = Math.min(gridCols - 1, Math.ceil((mx + LINK_R) / BG_GAP));
        const r0 = Math.max(0, Math.floor((my - LINK_R) / BG_GAP));
        const r1 = Math.ceil((my + LINK_R) / BG_GAP);
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const i = r * gridCols + c;
            const a = ambient[i];
            if (!a) continue;
            const dm = Math.hypot(a.x - mx, a.y - my);
            if (dm > LINK_R) continue;
            ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - dm / LINK_R) * 0.55})`;
            ctx.beginPath();
            const right = c < gridCols - 1 ? ambient[i + 1] : undefined;
            const down = ambient[i + gridCols];
            if (right) {
              ctx.moveTo(a.x, a.y - a.h);
              ctx.lineTo(right.x, right.y - right.h);
            }
            if (down) {
              ctx.moveTo(a.x, a.y - a.h);
              ctx.lineTo(down.x, down.y - down.h);
            }
            ctx.stroke();
          }
        }
      }

      // portrait / globe dots: far side of the globe first, dimmer
      const scan = (((t % 9) / 9) * (h + 240)) - 120; // beam sweeps top → bottom every 9s
      for (const front of [false, true]) {
        ctx.fillStyle = `rgba(56, 189, 248, ${(front ? 0.9 : 0.22) * dim})`;
        ctx.beginPath();
        for (const d of portrait) {
          if (ts < d.delay || (d.z >= 0) !== front) continue;
          const g = GLOBE_R * (0.55 + 0.225 * (d.z + 1));
          const gg = (d.y - scan) / 42;
          const r = (g + (d.r - g) * d.k) * (1 + 0.9 * Math.exp(-gg * gg));
          ctx.moveTo(d.x + r, d.y);
          ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // requests arcing between regions while the globe holds
      const globeA = smoothstep(0, 1.2, ts) * (1 - smoothstep(GLOBE_S, GLOBE_S + 0.6, ts)) * dim;
      if (globeA > 0.01) {
        const hubs = HUBS.map(proj);
        ctx.lineWidth = 1;
        LINKS.forEach(([i, j], k) => {
          const a = hubs[i];
          const b = hubs[j];
          if (a[2] < -0.3 && b[2] < -0.3) return;
          const c = proj(LIFTS[k]);
          ctx.strokeStyle = `rgba(232, 234, 240, ${0.4 * globeA})`;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
          ctx.stroke();
          const u = (t * 0.35 + k * 0.17) % 1;
          const v = 1 - u;
          ctx.fillStyle = `rgba(255, 255, 255, ${globeA})`;
          ctx.beginPath();
          ctx.arc(v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1], 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = `rgba(255, 255, 255, ${globeA})`;
        ctx.beginPath();
        for (const p of hubs) {
          if (p[2] < -0.2) continue;
          ctx.moveTo(p[0] + 3, p[1]);
          ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // click packets hopping along the grid
      if (packets.length) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        for (const p of packets) {
          const a = ambient[p.i];
          const b = ambient[p.j];
          const x = a.x + (b.x - a.x) * p.u;
          const y = a.y - a.h + (b.y - b.h - (a.y - a.h)) * p.u;
          ctx.moveTo(x + 2.4, y);
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      acc = Math.min(acc + (last ? now - last : 0), 50);
      last = now;
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        simulate(now);
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
      ({ portrait, ambient, gridCols, globe } = build(img, w, h));
      packets.length = 0; // their indices pointed into the old grid
      // a resize after the intro shouldn't replay it: park every dot at home and jump the clock past it
      if (live) {
        startedAt = reduced ? -Infinity : performance.now() - 1e5;
        for (const d of portrait) {
          d.x = d.hx;
          d.y = d.hy;
          d.k = 1;
        }
      }
      if (reduced) draw(0);
    };

    const start = () => {
      startedAt = performance.now();
      live = true;
    };
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      mx = e.clientX - b.left;
      my = e.clientY - b.top;
    };
    const onLeave = () => {
      mx = my = -9999;
    };
    const onDown = (e: PointerEvent) => {
      if (!live || (e.target instanceof Element && e.target.closest("a, button"))) return;
      const b = canvas.getBoundingClientRect();
      const cx = e.clientX - b.left;
      const cy = e.clientY - b.top;
      for (const d of portrait) {
        const dx = d.x - cx;
        const dy = d.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > BOOM_R) continue;
        const f = (1 - dist / BOOM_R) * (5 + Math.random() * 9);
        d.vx += (dx / dist) * f;
        d.vy += (dy / dist) * f;
      }
      ripples.push({ x: cx, y: cy, t: performance.now() / 1000 });
      const col = Math.min(gridCols - 1, Math.max(0, Math.round(cx / BG_GAP)));
      send(Math.min(ambient.length - 1, Math.max(0, Math.round(cy / BG_GAP) * gridCols + col)));
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
      window.addEventListener("pointerdown", onDown);
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      img.onload = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("preloader:lift", start);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
