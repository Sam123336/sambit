"use client";

import { useSimStore } from "@/store/simStore";
import BrandLogo, { type BrandName } from "./three/BrandLogo";
import type { NodeKind } from "./types";

const TRAY_BRAND: Partial<Record<NodeKind, BrandName>> = {
  server: "node",
  loadbalancer: "elb",
  redis: "redis",
  rabbitmq: "rabbitmq",
};

export default function ComponentTray({
  items,
}: {
  items: { kind: NodeKind; label: string; hint: string }[];
}) {
  const addNode = useSimStore((s) => s.addNode);

  if (items.length === 0) return null;

  return (
    <div className="node-3d pointer-events-auto absolute bottom-3 left-3 z-30 w-44 rounded-xl border border-border p-2.5 backdrop-blur sm:bottom-4 sm:left-4 sm:w-56 sm:p-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
        Available
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.kind}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", item.kind);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => addNode(item.kind)}
            title="Drag onto the canvas, or click to add"
            className="cursor-grab select-none rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-accent/50 hover:text-accent active:cursor-grabbing"
          >
            <div className="flex items-center gap-1.5">
              {TRAY_BRAND[item.kind] && <BrandLogo name={TRAY_BRAND[item.kind]!} size={12} />}
              {item.label}
            </div>
            <div className="mt-0.5 text-[10px] font-normal normal-case text-foreground-muted">
              {item.hint}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
