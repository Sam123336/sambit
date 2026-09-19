"use client";

import { useRef } from "react";
import Image from "next/image";

/** How much of the screen stays sharp under the cursor. Nothing else ever clears. */
const HOLE = 58;
const NUDGE = "Wow — eager to know, are you?";

/**
 * Frosted screen you rub to read. A blurred copy sits over the sharp one and gets a
 * mask hole punched at the pointer; move away and it frosts back over. Never fully clears —
 * you only ever see what you are pointing at.
 */
export default function ScratchReveal({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  const veil = useRef<HTMLDivElement>(null);
  const spoke = useRef(false);

  const setMask = (value: string) => {
    const el = veil.current;
    if (!el) return;
    el.style.setProperty("mask-image", value);
    el.style.setProperty("-webkit-mask-image", value);
  };

  const rub = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMask(
      `radial-gradient(circle ${HOLE}px at ${e.clientX - r.left}px ${e.clientY - r.top}px, transparent 0, transparent 30%, #000 100%)`,
    );
    if (!spoke.current) {
      spoke.current = true;
      window.dispatchEvent(new CustomEvent("guide:say", { detail: NUDGE }));
    }
  };

  return (
    <>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-top" />
      {/* scaled up so the blur feathers past the screen edge instead of leaking the sharp
          image around the rim */}
      <div ref={veil} aria-hidden className="absolute inset-0 scale-110">
        <Image src={src} alt="" fill sizes={sizes} className="object-cover object-top blur-[9px]" />
      </div>
      {/* pan-y keeps the page scrollable while rubbing on a phone */}
      <div
        className="absolute inset-0 cursor-crosshair touch-pan-y"
        onPointerMove={rub}
        onPointerLeave={() => setMask("none")}
      />
    </>
  );
}
