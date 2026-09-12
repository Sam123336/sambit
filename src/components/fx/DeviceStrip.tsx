"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronIcon } from "@/components/icons";

export default function PhoneStrip({
  shots,
}: {
  shots: readonly (readonly [string, string])[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const syncEdges = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    syncEdges();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".phone-card", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    }, el);

    return () => ctx.revert();
  }, [syncEdges]);

  const step = (dir: 1 | -1) => {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector(".phone-card");
    const by = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    // native smooth scroll, not a gsap scrollLeft tween: scroll-snap overrides the
    // tween's intermediate positions and the motion lands as a jump
    el.scrollBy({ left: dir * by, behavior: "smooth" });
  };

  // fade only the side that actually has more content, so a resting strip has no ghost edge
  const mask = `linear-gradient(to right, ${canLeft ? "transparent" : "#000"} 0, #000 2.5rem, #000 calc(100% - 2.5rem), ${canRight ? "transparent" : "#000"} 100%)`;

  return (
    <div className="mt-6">
      <div className="mb-3 flex justify-end gap-2">
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => step(dir)}
            disabled={dir === -1 ? !canLeft : !canRight}
            aria-label={dir === -1 ? "Previous screens" : "Next screens"}
            className="flex size-11 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors hover:border-foreground-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronIcon size={16} dir={dir === -1 ? "left" : "right"} />
          </button>
        ))}
      </div>

      {/* scroll-pl matches the track inset, else the first snap point sits at scrollLeft 48 */}
      <div
        ref={viewportRef}
        onScroll={syncEdges}
        className="phone-strip -mx-6 snap-x snap-mandatory scroll-pl-6 overflow-x-auto pb-2 md:-mx-12 md:scroll-pl-12"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div className="flex w-max gap-5 px-6 md:px-12">
          {shots.map(([src, caption]) => (
            <figure key={src} className="phone-card w-44 shrink-0 snap-start sm:w-56 lg:w-64">
              <span className="relative block aspect-[9/19] w-full overflow-hidden rounded-2xl border border-border bg-bg-elevated">
                <Image
                  src={src}
                  alt={caption}
                  fill
                  sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 11rem"
                  className="object-cover object-top"
                />
              </span>
              <figcaption className="mt-3 text-[11px] leading-snug text-foreground-muted">
                {caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
