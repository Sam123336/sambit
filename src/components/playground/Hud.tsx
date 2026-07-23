"use client";

import { useSimStore } from "@/store/simStore";
import { useMetrics } from "./useMetrics";
import AnimatedNumber from "@/components/fx/AnimatedNumber";

export default function Hud() {
  const traffic = useSimStore((s) => s.traffic);
  const { aggregate } = useMetrics();

  const successTone =
    aggregate.successPct >= 99
      ? "text-success"
      : aggregate.successPct >= 60
        ? "text-warning"
        : "text-critical";

  return (
    <div className="node-3d pointer-events-none absolute right-4 top-4 z-30 hidden w-52 rounded-xl border border-border p-3.5 font-mono text-xs backdrop-blur sm:block">
      <div className="mb-2.5 flex items-center justify-between text-foreground-muted">
        <span className="text-[10px] uppercase tracking-widest">Traffic</span>
        <span className="tabular-nums text-foreground">
          <AnimatedNumber value={traffic} format={(v) => Math.round(v).toLocaleString()} /> req/s
        </span>
      </div>
      <dl className="space-y-1.5">
        <div className="flex justify-between">
          <dt className="text-foreground-muted">Latency</dt>
          <dd className="tabular-nums">
            <AnimatedNumber value={aggregate.latencyMs} />
            ms
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground-muted">Success</dt>
          <dd className={`tabular-nums ${successTone}`}>
            <AnimatedNumber value={aggregate.successPct} />%
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground-muted">CPU</dt>
          <dd className="tabular-nums">
            <AnimatedNumber value={aggregate.cpuPct} />%
          </dd>
        </div>
      </dl>
    </div>
  );
}
