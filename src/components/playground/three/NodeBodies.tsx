"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Cuboid from "./Cuboid";
import Cylinder from "./Cylinder";
import GlassBox from "./GlassBox";
import BrandLogo from "./BrandLogo";

/** Brand mark floating upright in front of a 3D body (counter-rotates the scene pose). */
function FloatingBrand({ name, size = 18, y = -20 }: { name: Parameters<typeof BrandLogo>[0]["name"]; size?: number; y?: number }) {
  return (
    <span
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotateY(34deg) rotateX(24deg) translateY(${y}px) translateZ(46px)`,
        filter: "drop-shadow(0 0 6px rgba(0,0,0,0.8))",
      }}
      aria-hidden
    >
      <BrandLogo name={name} size={size} />
    </span>
  );
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Shared three-quarter pose + idle float. Every node body renders inside one of
 * these so the whole board reads as a single coherent 3D scene.
 */
export function Pose({
  children,
  w,
  h,
  spin = false,
}: {
  children: React.ReactNode;
  w: number;
  h: number;
  spin?: boolean;
}) {
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || reducedMotion()) return;
    const tweens: gsap.core.Tween[] = [
      gsap.to(rig, {
        y: -4,
        duration: 2.6 + Math.random() * 1.2,
        delay: Math.random(),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      }),
    ];
    if (spin) {
      tweens.push(gsap.to(rig.firstElementChild, { rotationY: 360, duration: 14, repeat: -1, ease: "none" }));
    }
    return () => tweens.forEach((t) => t.kill());
  }, [spin]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: w, height: h, perspective: 700 }}>
      <div ref={rigRef} style={{ transformStyle: "preserve-3d" }}>
        <div style={{ transform: "rotateX(-24deg) rotateY(-34deg)", transformStyle: "preserve-3d" }}>{children}</div>
      </div>
      <div className="ground-shadow" aria-hidden />
    </div>
  );
}

function Leds({ tone }: { tone: "ok" | "warn" | "crit" | "off" }) {
  const color =
    tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : tone === "crit" ? "bg-critical" : "bg-white/20";
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`block h-[3px] w-[3px] rounded-full ${color} ${tone !== "off" ? "led-blink" : ""}`}
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </span>
  );
}

function RackSlab({ tone, w = 96, d = 62 }: { tone: "ok" | "warn" | "crit" | "off"; w?: number; d?: number }) {
  return (
    <Cuboid
      w={w}
      h={20}
      d={d}
      faces={{
        front: {
          className: "flex items-center justify-between px-2",
          children: (
            <>
              <Leds tone={tone} />
              <span className="h-[3px] w-6 rounded-sm bg-white/10" />
            </>
          ),
        },
      }}
    />
  );
}

/** API/app server: two rack slabs; optionally sealed inside a descending glass container. */
export function ApiServerBody({
  tone,
  containerized,
  building,
  down,
}: {
  tone: "ok" | "warn" | "crit";
  containerized: boolean;
  building: boolean;
  down?: boolean;
}) {
  const glassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glassRef.current;
    if (!el) return;
    if (!containerized && !building) return;
    if (reducedMotion() || (containerized && !building)) {
      gsap.set(el, { y: 0, opacity: 1 });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { y: -90, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, ease: "power3.inOut" },
    );
    return () => {
      tween.progress(1).kill();
    };
  }, [containerized, building]);

  return (
    <div
      className="relative"
      style={{
        transformStyle: "preserve-3d",
        opacity: down ? 0.35 : 1,
        filter: down ? "grayscale(1)" : undefined,
        transition: "opacity 0.4s ease, filter 0.4s ease",
      }}
    >
      <div className="flex flex-col" style={{ transformStyle: "preserve-3d", gap: 4 }}>
        <RackSlab tone={down ? "off" : building ? "warn" : tone} />
        <RackSlab tone={down || building ? "off" : tone} />
      </div>
      {(containerized || building) && (
        <div
          ref={glassRef}
          className="absolute left-1/2 top-1/2"
          style={{ transform: "translate(-50%, -50%)", transformStyle: "preserve-3d" }}
        >
          <GlassBox
            w={118}
            h={66}
            d={84}
            frontChildren={
              containerized ? (
                <span className="flex items-center gap-1 rounded-sm border border-accent/50 bg-bg/80 px-1 py-0.5">
                  <BrandLogo name="docker" size={11} />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-accent">:3000</span>
                </span>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

/** PostgreSQL: grooved blue cylinder stack with the elephant out front. */
export function DatabaseBody() {
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <Cylinder
        r={30}
        h={54}
        bands="repeating-linear-gradient(180deg, rgba(59,130,246,0.28) 0px, rgba(30,41,72,0.95) 4px, rgba(17,22,38,0.98) 16px, rgba(17,22,38,0.98) 18px)"
        capBackground="radial-gradient(circle at 35% 35%, rgba(96,165,250,0.5), rgba(23,30,52,0.98) 70%)"
      />
      <FloatingBrand name="postgres" size={20} y={0} />
    </div>
  );
}

/** Redis: flat hot-red memory disc with the Redis mark above it. */
export function RedisBody() {
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <Cylinder
        r={27}
        h={18}
        bands="repeating-linear-gradient(180deg, rgba(248,113,113,0.35) 0px, rgba(80,18,22,0.95) 3px, rgba(40,10,14,0.98) 9px)"
        capBackground="radial-gradient(circle at 35% 35%, rgba(248,113,113,0.55), rgba(60,14,18,0.98) 72%)"
      />
      <FloatingBrand name="redis" size={18} y={-22} />
    </div>
  );
}

/** Spinning glass prism — load balancer, and the EventBridge bus in pink. */
export function PrismBody({
  rgb = "140,79,255",
  brand = "elb",
}: {
  rgb?: string;
  brand?: Parameters<typeof BrandLogo>[0]["name"];
} = {}) {
  const spinRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!spinRef.current || reducedMotion()) return;
    const t = gsap.to(spinRef.current, { rotationY: 360, duration: 10, repeat: -1, ease: "none" });
    return () => {
      t.kill();
    };
  }, []);
  // AWS console color, so the prism reads as the service it stands for
  const glass = (alpha: number) => ({
    background: `rgba(${rgb},${alpha})`,
    border: `1px solid rgba(${rgb},0.55)`,
    boxShadow: `inset 0 0 14px rgba(${rgb},0.22)`,
  });
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <div ref={spinRef} style={{ transformStyle: "preserve-3d" }}>
        <Cuboid
          w={40}
          h={40}
          d={40}
          faces={{
            front: { style: glass(0.16) },
            back: { style: glass(0.1) },
            left: { style: glass(0.08) },
            right: { style: glass(0.08) },
            top: { style: glass(0.22) },
            bottom: { style: glass(0.05) },
          }}
        />
      </div>
      <FloatingBrand name={brand} size={20} y={0} />
    </div>
  );
}

/** Message queue: conveyor rail with message cubes marching along it. */
export function QueueBody({
  brand = "rabbitmq",
  rgb = "251,146,60",
  stalled = false,
}: {
  brand?: Parameters<typeof BrandLogo>[0]["name"];
  /** accent channel for the belt and cubes */
  rgb?: string;
  /** dead-letter queues hold messages instead of moving them */
  stalled?: boolean;
} = {}) {
  const beltRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const belt = beltRef.current;
    if (!belt || reducedMotion() || stalled) return;
    const cubes = Array.from(belt.children);
    const tweens = cubes.map((cube, i) =>
      gsap.fromTo(
        cube,
        { x: -8, opacity: 0 },
        {
          x: 96,
          opacity: 1,
          duration: 2.4,
          delay: i * 0.8,
          repeat: -1,
          ease: "none",
          onRepeat: () => gsap.set(cube, { x: -8, opacity: 0 }),
        },
      ),
    );
    return () => tweens.forEach((t) => t.kill());
  }, [stalled]);

  const orange = (a: number) => `rgba(${rgb},${a})`;
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <Cuboid
        w={120}
        h={10}
        d={36}
        faces={{
          top: {
            style: {
              background: `repeating-linear-gradient(90deg, rgba(${rgb},0.25) 0px, rgba(30,24,18,0.95) 2px, rgba(16,13,10,0.98) 12px)`,
            },
          },
        }}
      />
      <FloatingBrand name={brand} size={18} y={-30} />
      <div
        ref={beltRef}
        className="absolute left-0"
        style={{ top: -14, transformStyle: "preserve-3d" }}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute"
            style={{ transformStyle: "preserve-3d", ...(stalled ? { transform: `translateX(${20 + i * 18}px)` } : null) }}
          >
            <Cuboid
              w={12}
              h={12}
              d={12}
              faces={{
                front: { style: { background: orange(0.35), border: `1px solid ${orange(0.7)}` } },
                top: { style: { background: orange(0.5), border: `1px solid ${orange(0.7)}` } },
                right: { style: { background: orange(0.2), border: `1px solid ${orange(0.6)}` } },
                left: { style: { background: orange(0.2), border: `1px solid ${orange(0.6)}` } },
                back: { style: { background: orange(0.15) } },
                bottom: { style: { background: orange(0.1) } },
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Third-party provider: gold-tinted satellite panel outside your boundary. */
export function ProviderBody() {
  const gold = (a: number) => `rgba(251,191,36,${a})`;
  return (
    <Cuboid
      w={92}
      h={56}
      d={12}
      faces={{
        front: {
          className: "flex flex-col items-center justify-center gap-1",
          style: {
            background: `linear-gradient(165deg, ${gold(0.16)} 0%, rgba(30,24,10,0.96) 60%)`,
            border: `1px solid ${gold(0.45)}`,
          },
          children: (
            <>
              <span className="font-mono text-sm text-amber-300" style={{ textShadow: `0 0 10px ${gold(0.8)}` }}>
                ₹
              </span>
              <span className="font-mono text-[7px] uppercase tracking-widest text-amber-200/80">payments inc</span>
            </>
          ),
        },
        top: { style: { background: `linear-gradient(135deg, ${gold(0.2)}, rgba(20,16,8,0.98))` } },
      }}
    />
  );
}

/** Async worker: small cube with a colored cap. */
export function WorkerBody({ hue }: { hue: string }) {
  return (
    <Cuboid
      w={30}
      h={30}
      d={30}
      faces={{
        front: {
          className: "flex items-center justify-center",
          children: <span className="font-mono text-[10px] text-foreground-muted">⚙</span>,
        },
        top: { style: { background: `linear-gradient(135deg, ${hue}, rgba(15,18,26,0.98) 70%)` } },
      }}
    />
  );
}

/** Client: floating device with a glowing screen. */
export function ClientBody() {
  return (
    <Cuboid
      w={78}
      h={52}
      d={8}
      faces={{
        front: {
          className: "flex items-center justify-center",
          style: {
            background: "linear-gradient(150deg, rgba(56,189,248,0.2) 0%, rgba(139,92,246,0.12) 50%, rgba(10,12,18,0.95) 100%)",
            boxShadow: "inset 0 0 16px rgba(56,189,248,0.15)",
          },
          children: (
            <span className="flex flex-col items-center gap-1" aria-hidden>
              <span className="h-1 w-8 rounded-full bg-white/25" />
              <span className="h-1 w-6 rounded-full bg-white/15" />
              <span className="h-1 w-7 rounded-full bg-white/10" />
            </span>
          ),
        },
      }}
    />
  );
}

/** Internet gateway: portal arch of three pillars. */
export function GatewayBody() {
  return (
    <div className="relative flex items-end justify-center" style={{ transformStyle: "preserve-3d", width: 64, height: 56 }}>
      <div className="absolute left-1" style={{ bottom: 0, transformStyle: "preserve-3d" }}>
        <Cuboid w={12} h={44} d={12} />
      </div>
      <div className="absolute right-1" style={{ bottom: 0, transformStyle: "preserve-3d" }}>
        <Cuboid w={12} h={44} d={12} />
      </div>
      <div className="absolute" style={{ top: 0, transformStyle: "preserve-3d" }}>
        <Cuboid
          w={64}
          h={12}
          d={16}
          faces={{ top: { style: { background: "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(15,18,26,0.98) 60%)" } } }}
        />
      </div>
    </div>
  );
}

/** Kubernetes control plane: the box that keeps watching, on a kube-blue plinth. */
export function ControlPlaneBody() {
  const KUBE = "50,108,229";
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <Cuboid
        w={72}
        h={34}
        d={52}
        faces={{
          front: {
            className: "flex items-center justify-center gap-1.5",
            style: {
              background: `linear-gradient(165deg, rgba(${KUBE},0.22) 0%, rgba(8,12,24,0.96) 70%)`,
              border: `1px solid rgba(${KUBE},0.5)`,
            },
            children: <Leds tone="ok" />,
          },
          top: { style: { background: `linear-gradient(135deg, rgba(${KUBE},0.35), rgba(10,14,26,0.98) 65%)` } },
        }}
      />
      {/* api-server · scheduler · etcd, the control loops that do the healing */}
      <div className="absolute left-1/2 flex gap-1.5" style={{ top: -14, transform: "translateX(-50%)", transformStyle: "preserve-3d" }} aria-hidden>
        {[0, 1, 2].map((i) => (
          <Cuboid
            key={i}
            w={12}
            h={12}
            d={12}
            faces={{
              top: { style: { background: `rgba(${KUBE},0.45)`, border: `1px solid rgba(${KUBE},0.6)` } },
              front: { style: { background: `rgba(${KUBE},0.2)`, border: `1px solid rgba(${KUBE},0.5)` } },
            }}
          />
        ))}
      </div>
      <FloatingBrand name="kubernetes" size={20} y={-4} />
    </div>
  );
}

export type StageStatus = "idle" | "run" | "pass" | "fail";

const STAGE_RGB: Record<StageStatus, string> = {
  idle: "120,130,150",
  run: "245,158,11",
  pass: "34,197,94",
  fail: "239,68,68",
};

/** CI/CD pipeline: three stage blocks that light up in order as the run progresses. */
export function PipelineBody({ stages }: { stages: { name: string; status: StageStatus }[] }) {
  const runningRef = useRef<HTMLDivElement>(null);
  const runningIndex = stages.findIndex((s) => s.status === "run");

  useEffect(() => {
    const el = runningRef.current;
    if (!el || runningIndex < 0 || reducedMotion()) return;
    const t = gsap.to(el, { opacity: 0.4, duration: 0.45, repeat: -1, yoyo: true, ease: "sine.inOut" });
    return () => {
      gsap.set(el, { opacity: 1 });
      t.kill();
    };
  }, [runningIndex]);

  return (
    <div className="relative flex items-center" style={{ transformStyle: "preserve-3d", gap: 8 }}>
      {stages.map((stage, i) => {
        const rgb = STAGE_RGB[stage.status];
        return (
          <div
            key={stage.name}
            ref={i === runningIndex ? runningRef : undefined}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Cuboid
              w={30}
              h={28}
              d={30}
              faces={{
                front: {
                  className: "flex items-center justify-center",
                  style: {
                    background: `linear-gradient(165deg, rgba(${rgb},0.28) 0%, rgba(10,12,18,0.96) 75%)`,
                    border: `1px solid rgba(${rgb},0.55)`,
                  },
                  children: (
                    <span
                      className="font-mono text-[9px] uppercase"
                      style={{ color: `rgb(${rgb})`, textShadow: `0 0 8px rgba(${rgb},0.8)` }}
                    >
                      {stage.status === "pass" ? "✓" : stage.status === "fail" ? "✕" : stage.name[0]}
                    </span>
                  ),
                },
                top: { style: { background: `linear-gradient(135deg, rgba(${rgb},0.4), rgba(12,14,20,0.98) 70%)` } },
              }}
            />
          </div>
        );
      })}
      <FloatingBrand name="githubactions" size={17} y={-28} />
    </div>
  );
}

/** Git repository: a stack of commits with the git mark out front. */
export function RepoBody() {
  const GIT = "240,60,46";
  return (
    <div className="relative" style={{ transformStyle: "preserve-3d" }}>
      <Cylinder
        r={24}
        h={40}
        bands={`repeating-linear-gradient(180deg, rgba(${GIT},0.3) 0px, rgba(40,18,16,0.95) 3px, rgba(18,12,12,0.98) 13px)`}
        capBackground={`radial-gradient(circle at 35% 35%, rgba(${GIT},0.45), rgba(30,14,12,0.98) 72%)`}
      />
      <FloatingBrand name="git" size={18} y={-16} />
    </div>
  );
}
