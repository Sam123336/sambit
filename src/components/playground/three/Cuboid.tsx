import type { CSSProperties, ReactNode } from "react";

export interface FaceSpec {
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";

const METAL = "linear-gradient(165deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, rgba(8,10,16,0.95) 100%)";
const SIDE = "linear-gradient(180deg, rgba(22,26,36,0.98), rgba(8,10,15,0.98))";
const TOP = "linear-gradient(135deg, rgba(56,189,248,0.10), rgba(15,18,26,0.98) 60%)";

const DEFAULT_BG: Record<FaceName, string> = {
  front: METAL,
  back: SIDE,
  left: SIDE,
  right: SIDE,
  top: TOP,
  bottom: "rgba(5,6,10,0.98)",
};

/** Six-face CSS 3D box. Parent chain must be preserve-3d with a perspective ancestor. */
export default function Cuboid({
  w,
  h,
  d,
  faces = {},
  className = "",
  style,
}: {
  w: number;
  h: number;
  d: number;
  faces?: Partial<Record<FaceName, FaceSpec>>;
  className?: string;
  style?: CSSProperties;
}) {
  const geom: Record<FaceName, CSSProperties> = {
    front: { width: w, height: h, transform: `translateZ(${d / 2}px)` },
    back: { width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)` },
    right: { width: d, height: h, left: (w - d) / 2, transform: `rotateY(90deg) translateZ(${w / 2}px)` },
    left: { width: d, height: h, left: (w - d) / 2, transform: `rotateY(-90deg) translateZ(${w / 2}px)` },
    top: { width: w, height: d, top: (h - d) / 2, transform: `rotateX(90deg) translateZ(${h / 2}px)` },
    bottom: { width: w, height: d, top: (h - d) / 2, transform: `rotateX(-90deg) translateZ(${h / 2}px)` },
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ width: w, height: h, transformStyle: "preserve-3d", ...style }}
    >
      {(Object.keys(geom) as FaceName[]).map((name) => {
        const spec = faces[name] ?? {};
        return (
          <div
            key={name}
            className={`absolute border border-white/10 ${spec.className ?? ""}`}
            style={{ background: DEFAULT_BG[name], ...geom[name], ...spec.style }}
          >
            {spec.children}
          </div>
        );
      })}
    </div>
  );
}
