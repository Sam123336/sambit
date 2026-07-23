"use client";

import { useEffect, useRef } from "react";
import { useReactFlow, type XYPosition } from "@xyflow/react";
import gsap from "gsap";
import type { PacketBurst, PacketVariant } from "./types";

const VARIANT_COLOR: Record<PacketVariant, string> = {
  request: "var(--color-accent)",
  hit: "var(--color-success)",
  miss: "var(--color-warning)",
  ws: "var(--color-accent-2)",
  webhook: "#fbbf24",
  queue: "#fb923c",
  blocked: "var(--color-critical)",
};

function centerOf(pos: XYPosition, width?: number, height?: number) {
  return { x: pos.x + (width ?? 140) / 2, y: pos.y + (height ?? 60) / 2 };
}

export default function PacketLayer({ bursts }: { bursts: PacketBurst[] }) {
  const { getNode, flowToScreenPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bursts.length === 0) return;

    const created: HTMLDivElement[] = [];
    const tweens: gsap.core.Tween[] = [];

    bursts.forEach((burst, i) => {
      const fromNode = getNode(burst.fromId);
      const toNode = getNode(burst.toId);
      if (!fromNode || !toNode) return;

      const color = burst.color ?? VARIANT_COLOR[burst.variant ?? "request"];
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;top:0;left:0;width:9px;height:9px;margin:-4.5px;border-radius:9999px;background:${color};box-shadow:0 0 10px ${color};will-change:transform;`;
      container.appendChild(el);
      created.push(el);

      const from = centerOf(fromNode.position, fromNode.measured?.width, fromNode.measured?.height);
      const to = centerOf(toNode.position, toNode.measured?.width, toNode.measured?.height);
      const progress = { t: 0 };

      const tween = gsap.to(progress, {
        t: 1,
        duration: burst.duration ?? 0.9,
        delay: i * 0.04,
        ease: "power1.inOut",
        onUpdate: () => {
          const t = progress.t;
          const flowX = from.x + (to.x - from.x) * t;
          const flowY = from.y + (to.y - from.y) * t;
          const screen = flowToScreenPosition({ x: flowX, y: flowY });
          // mid-flight hop: packets rise and swell as they travel, selling depth
          const hop = Math.sin(Math.PI * t);
          el.style.transform = `translate(${screen.x}px, ${screen.y - hop * 18}px) scale(${1 + hop * 0.5})`;
        },
        onComplete: () => {
          if (burst.blocked) {
            el.style.background = "var(--color-critical)";
            el.style.boxShadow = "0 0 12px var(--color-critical)";
            gsap.to(el, { scale: 2, opacity: 0, duration: 0.4, delay: 0.15, onComplete: () => el.remove() });
          } else {
            gsap.to(el, { scale: 1.6, opacity: 0, duration: 0.3, onComplete: () => el.remove() });
          }
        },
      });
      tweens.push(tween);
    });

    return () => {
      tweens.forEach((t) => t.kill());
      created.forEach((el) => el.remove());
    };
  }, [bursts, getNode, flowToScreenPosition]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-40" />;
}
