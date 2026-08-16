"use client";

import { useRef } from "react";
import Image from "next/image";

/** A blurred frame you rub with the pointer to see a sharp lens underneath. */
export default function BlurReveal({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const caught = useRef(false);

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
    el.style.setProperty("--lens", "7rem");

    // let the guide react, but only the first time per mount — it celebrates, it doesn't spasm
    if (!caught.current) {
      caught.current = true;
      window.dispatchEvent(new CustomEvent("guide:snoop"));
    }
  };

  const clear = () => ref.current?.style.setProperty("--lens", "0rem");

  return (
    <div
      ref={ref}
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={clear}
      onPointerCancel={clear}
      className="blur-reveal relative aspect-[9/19] w-full cursor-crosshair overflow-hidden rounded-2xl border border-border bg-bg-elevated"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 640px) 18rem, 14rem"
        className="scale-110 object-cover object-top blur-lg"
      />
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 640px) 18rem, 14rem"
        className="blur-reveal-lens object-cover object-top"
      />
    </div>
  );
}
