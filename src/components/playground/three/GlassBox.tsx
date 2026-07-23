import type { CSSProperties, ReactNode } from "react";
import Cuboid from "./Cuboid";

const GLASS = "linear-gradient(165deg, rgba(56,189,248,0.14) 0%, rgba(56,189,248,0.05) 50%, rgba(56,189,248,0.10) 100%)";
const GLASS_SIDE = "linear-gradient(180deg, rgba(56,189,248,0.09), rgba(56,189,248,0.04))";

/** Translucent container shell — the visible Docker box that wraps the app. */
export default function GlassBox({
  w,
  h,
  d,
  className = "",
  style,
  frontChildren,
}: {
  w: number;
  h: number;
  d: number;
  className?: string;
  style?: CSSProperties;
  frontChildren?: ReactNode;
}) {
  const edge = "1px solid rgba(56,189,248,0.45)";
  const face = (bg: string): CSSProperties => ({ background: bg, border: edge, boxShadow: "inset 0 0 18px rgba(56,189,248,0.12)" });
  return (
    <Cuboid
      w={w}
      h={h}
      d={d}
      className={className}
      style={style}
      faces={{
        front: { style: face(GLASS), children: frontChildren, className: "flex items-end justify-center pb-1" },
        back: { style: face(GLASS_SIDE) },
        left: { style: face(GLASS_SIDE) },
        right: { style: face(GLASS_SIDE) },
        top: { style: face("linear-gradient(135deg, rgba(56,189,248,0.16), rgba(56,189,248,0.06))") },
        bottom: { style: { background: "transparent", border: edge } },
      }}
    />
  );
}
