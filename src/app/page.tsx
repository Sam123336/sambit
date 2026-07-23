"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import AmbientBlobs from "@/components/fx/AmbientBlobs";
import ServerStack3D from "@/components/fx/ServerStack3D";
import { profile } from "@/data/profile";

const BORING_LINKS = [
  { label: "Experience", href: "/experience" },
  { label: "Work", href: "/work" },
  { label: "Resume", href: "/resume" },
  { label: "Contact", href: "/contact" },
];

export default function Landing() {
  const rootRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(".hero-stack", { opacity: 0, y: -30, duration: 0.8 })
        .from(".hero-char", {
          opacity: 0,
          y: 22,
          rotateX: -45,
          duration: 0.6,
          stagger: 0.03,
        })
        .from(".hero-role", { opacity: 0, y: 10, duration: 0.5 }, "-=0.3")
        .from(".hero-tagline", { opacity: 0, y: 12, duration: 0.5 }, "-=0.25")
        .from(
          ".hero-cta",
          { opacity: 0, scale: 0.9, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.2",
        )
        .from(".hero-rest", { opacity: 0, y: 8, duration: 0.4, stagger: 0.1 }, "-=0.2");
    }, rootRef);

    // Magnetic pull on the CTA (clamped so it never leaves its hit box)
    const cta = ctaRef.current;
    let cleanupMagnet: (() => void) | undefined;
    if (cta) {
      const xTo = gsap.quickTo(cta, "x", { duration: 0.4, ease: "elastic.out(1,0.4)" });
      const yTo = gsap.quickTo(cta, "y", { duration: 0.4, ease: "elastic.out(1,0.4)" });
      const onMove = (e: MouseEvent) => {
        const r = cta.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.25);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      cta.addEventListener("mousemove", onMove);
      cta.addEventListener("mouseleave", onLeave);
      cleanupMagnet = () => {
        cta.removeEventListener("mousemove", onMove);
        cta.removeEventListener("mouseleave", onLeave);
      };
    }

    return () => {
      ctx.revert();
      cleanupMagnet?.();
    };
  }, []);

  return (
    <main
      ref={rootRef}
      className="bg-grid relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-6 py-16 text-center"
    >
      <AmbientBlobs />

      <div className="hero-stack relative hidden md:block">
        <ServerStack3D />
      </div>

      <div className="relative" style={{ perspective: 600 }}>
        <h1 className="font-mono text-3xl font-semibold tracking-wide md:text-5xl">
          {profile.name.toUpperCase().split("").map((ch, i) => (
            <span key={i} className="hero-char inline-block" style={{ whiteSpace: "pre" }}>
              {ch}
            </span>
          ))}
        </h1>
        <p className="hero-role mt-3 font-mono text-sm tracking-widest text-foreground-muted md:text-base">
          {profile.role}
        </p>
      </div>

      <p className="hero-tagline relative max-w-md text-lg text-foreground-muted md:text-xl">
        Most portfolios tell you what someone knows.
        <br />
        <span className="font-medium text-accent">Mine lets you break it.</span>
      </p>

      <Link
        ref={ctaRef}
        href="/play"
        className="hero-cta relative rounded-md border border-accent/40 bg-accent/10 px-8 py-3.5 font-mono text-sm uppercase tracking-widest text-accent shadow-[0_0_32px_var(--color-accent-glow)] transition-colors duration-200 hover:bg-accent/20 hover:shadow-[0_0_48px_var(--color-accent-glow)]"
      >
        Enter System
      </Link>

      <div className="hero-rest relative -mt-4 flex items-center gap-2 font-mono text-xs text-success">
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-success shadow-[0_0_8px_var(--color-success)]"
          aria-hidden
        />
        Production healthy
      </div>

      <div className="hero-rest relative flex flex-col items-center gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          Prefer the boring version?
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {BORING_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-widest text-foreground-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
