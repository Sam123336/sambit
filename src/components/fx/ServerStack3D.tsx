"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const W = 170; // slab width
const H = 34; // slab height
const D = 110; // slab depth

/** One 3D slab: six faces positioned with real translateZ geometry. */
function Slab({ y, lit }: { y: number; lit: boolean }) {
  const face = "absolute border border-white/10";
  const metal =
    "linear-gradient(165deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, rgba(8,10,16,0.95) 100%)";
  const side = "linear-gradient(180deg, rgba(20,24,34,0.98), rgba(8,10,15,0.98))";

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: W,
        height: H,
        margin: `${-H / 2}px 0 0 ${-W / 2}px`,
        transform: `translateY(${y}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* front */}
      <div
        className={`${face} flex items-center justify-between px-3`}
        style={{ width: W, height: H, transform: `translateZ(${D / 2}px)`, background: metal }}
      >
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block h-1 w-1 rounded-full ${lit ? "led-blink bg-accent" : "bg-white/20"}`}
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </span>
        <span className="h-1.5 w-8 rounded-sm bg-white/10" />
      </div>
      {/* back */}
      <div
        className={face}
        style={{ width: W, height: H, transform: `rotateY(180deg) translateZ(${D / 2}px)`, background: side }}
      />
      {/* right */}
      <div
        className={face}
        style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(90deg) translateZ(${W / 2}px)`, background: side }}
      />
      {/* left */}
      <div
        className={face}
        style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(-90deg) translateZ(${W / 2}px)`, background: side }}
      />
      {/* top */}
      <div
        className={face}
        style={{
          width: W,
          height: D,
          top: (H - D) / 2,
          transform: `rotateX(90deg) translateZ(${H / 2}px)`,
          background: "linear-gradient(135deg, rgba(56,189,248,0.10), rgba(15,18,26,0.98) 60%)",
        }}
      />
      {/* bottom */}
      <div
        className={face}
        style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(-90deg) translateZ(${H / 2}px)`, background: "rgba(5,6,10,0.98)" }}
      />
    </div>
  );
}

/** Slowly rotating 3D rack of server slabs with a glowing ground disc. */
export default function ServerStack3D() {
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const spin = gsap.to(rig, {
      rotationY: 360,
      duration: 26,
      repeat: -1,
      ease: "none",
    });
    const bob = gsap.to(rig, {
      y: -8,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => {
      spin.kill();
      bob.kill();
      gsap.set(rig, { clearProps: "all" });
    };
  }, []);

  return (
    <div
      aria-hidden
      className="relative mx-auto"
      style={{ width: 260, height: 220, perspective: 900 }}
    >
      <div
        ref={rigRef}
        className="absolute inset-0"
        style={{ transform: "rotateX(-18deg)", transformStyle: "preserve-3d" }}
      >
        <Slab y={-46} lit />
        <Slab y={0} lit />
        <Slab y={46} lit={false} />
      </div>
      {/* glowing ground disc */}
      <div
        className="absolute left-1/2 top-full h-10 w-56 -translate-x-1/2 -translate-y-3 rounded-[100%]"
        style={{
          background:
            "radial-gradient(ellipse, var(--color-accent-glow) 0%, transparent 65%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}
