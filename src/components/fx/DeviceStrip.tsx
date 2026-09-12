"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronIcon } from "@/components/icons";
import DeviceFrame from "@/components/fx/DeviceFrame";

// poster: a finished marketing frame that already contains its own device, so no bezel
type Kind = "phone" | "tablet" | "laptop" | "poster";
export type Shot = readonly [src: string, caption: string, kind?: Kind];

// widths tuned so a laptop, a tablet and a phone in one row stand equally tall from sm up
const WIDTH: Record<Kind, string> = {
  laptop: "w-[20rem] sm:w-[28rem] lg:w-[32rem]",
  tablet: "w-[15.5rem] sm:w-[22rem] lg:w-[25rem]",
  phone: "w-[8.3rem] lg:w-[9.5rem]",
  poster: "w-44 sm:w-56 lg:w-64",
};
// phones with nothing bigger beside them get room to be read
const PHONE_ALONE = "w-44 sm:w-56 lg:w-64";
const SIZES: Record<Kind, string> = {
  laptop: "(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 20rem",
  tablet: "(min-width: 1024px) 25rem, (min-width: 640px) 22rem, 16rem",
  phone: "(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 11rem",
  poster: "(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 11rem",
};

export default function DeviceStrip({ shots }: { shots: readonly Shot[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const phonesAlone = shots.every(([, , kind = "phone"]) => kind === "phone");

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
      gsap.from(".device-card", {
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
    // most of a viewport at a time; scroll-snap settles it on a card. Native smooth scroll,
    // not a gsap scrollLeft tween: scroll-snap overrides the tween's intermediate positions
    // and the motion lands as a jump
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
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
        className="device-strip -mx-6 snap-x snap-mandatory scroll-pl-6 overflow-x-auto pb-2 md:-mx-12 md:scroll-pl-12"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div className="flex w-max items-start gap-5 px-6 md:px-12">
          {shots.map(([src, caption, kind = "phone"]) => (
            <figure
              key={src}
              className={`device-card shrink-0 snap-start ${kind === "phone" && phonesAlone ? PHONE_ALONE : WIDTH[kind]}`}
            >
              {kind === "poster" ? (
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-bg-elevated">
                  <Image src={src} alt={caption} fill sizes={SIZES[kind]} className="object-cover" />
                </div>
              ) : (
                <DeviceFrame kind={kind}>
                  <Image
                    src={src}
                    alt={caption}
                    fill
                    sizes={SIZES[kind]}
                    className="object-cover object-top"
                  />
                </DeviceFrame>
              )}
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
