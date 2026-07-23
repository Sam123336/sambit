import type { CSSProperties } from "react";

/** CSS 3D cylinder, vertical axis. Wall built from rotated segments, elliptical caps. */
export default function Cylinder({
  r,
  h,
  segments = 18,
  wallBackground = "linear-gradient(180deg, rgba(30,36,50,0.98), rgba(10,12,18,0.98))",
  capBackground = "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(20,24,34,0.98) 70%)",
  bands,
  className = "",
  style,
}: {
  r: number;
  h: number;
  segments?: number;
  wallBackground?: string;
  capBackground?: string;
  /** optional horizontal groove bands rendered on every wall segment (e.g. DB disc seams) */
  bands?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const segW = (2 * Math.PI * r) / segments + 0.8;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: 2 * r, height: h, transformStyle: "preserve-3d", ...style }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: segW,
            height: h,
            left: r - segW / 2,
            background: bands ?? wallBackground,
            transform: `rotateY(${(i * 360) / segments}deg) translateZ(${r}px)`,
            backfaceVisibility: "hidden",
          }}
        />
      ))}
      {/* top cap */}
      <div
        className="absolute rounded-full border border-white/15"
        style={{
          width: 2 * r,
          height: 2 * r,
          top: h / 2 - r,
          background: capBackground,
          transform: `rotateX(90deg) translateZ(${h / 2}px)`,
        }}
      />
      {/* bottom cap */}
      <div
        className="absolute rounded-full"
        style={{
          width: 2 * r,
          height: 2 * r,
          top: h / 2 - r,
          background: "rgba(5,6,10,0.98)",
          transform: `rotateX(-90deg) translateZ(${h / 2}px)`,
        }}
      />
    </div>
  );
}
