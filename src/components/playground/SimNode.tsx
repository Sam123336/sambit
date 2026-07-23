"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMetrics } from "./useMetrics";
import AnimatedNumber from "@/components/fx/AnimatedNumber";
import {
  Pose,
  ApiServerBody,
  DatabaseBody,
  RedisBody,
  LoadBalancerBody,
  QueueBody,
  ProviderBody,
  WorkerBody,
  ClientBody,
  GatewayBody,
} from "./three/NodeBodies";
import BrandLogo, { type BrandName } from "./three/BrandLogo";
import type { SimNode as SimNodeType, NodeKind } from "./types";

type Tone = "success" | "warning" | "critical" | "muted";

function StatusDot({ tone }: { tone: Tone }) {
  const color =
    tone === "success"
      ? "bg-success shadow-[0_0_8px_var(--color-success)]"
      : tone === "warning"
        ? "bg-warning shadow-[0_0_8px_var(--color-warning)]"
        : tone === "critical"
          ? "bg-critical shadow-[0_0_8px_var(--color-critical)]"
          : "bg-foreground-muted";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

function Plate({
  label,
  tone = "muted",
  brand,
  children,
}: {
  label: string;
  tone?: Tone;
  brand?: BrandName;
  children?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none mx-auto mt-1 w-max max-w-[170px] rounded-md border border-border bg-bg-elevated/90 px-2 py-1 text-center font-mono backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-widest text-foreground">
        {brand && <BrandLogo name={brand} size={11} />}
        {label}
        <StatusDot tone={tone} />
      </div>
      {children}
    </div>
  );
}

function Assembly({
  w = 150,
  bodyH = 110,
  critical,
  children,
  plate,
  hasTarget = true,
  hasSource = true,
}: {
  w?: number;
  bodyH?: number;
  critical?: boolean;
  children: React.ReactNode;
  plate: React.ReactNode;
  hasTarget?: boolean;
  hasSource?: boolean;
}) {
  return (
    <div className={`relative ${critical ? "node-critical rounded-2xl" : ""}`} style={{ width: w }}>
      {hasTarget && <Handle type="target" position={Position.Left} className="!bg-border" />}
      <Pose w={w} h={bodyH}>
        {children}
      </Pose>
      {plate}
      {hasSource && <Handle type="source" position={Position.Right} className="!bg-border" />}
    </div>
  );
}

function ServerNode({ id, data }: { id: string; data: SimNodeType["data"] }) {
  const { perServer } = useMetrics();
  const m = perServer[id];
  const building = data.buildStatus === "building";
  const tone: Tone = !m ? "muted" : m.healthy ? "success" : m.utilization > 1.5 ? "critical" : "warning";
  const bodyTone = tone === "critical" ? "crit" : tone === "warning" ? "warn" : "ok";

  return (
    <Assembly critical={tone === "critical"} plate={
      <Plate label={data.label} tone={building ? "warning" : tone} brand={data.containerized ? "docker" : "node"}>
        {m && !building && (
          <div className="mt-0.5 flex justify-center gap-2 text-[9px] text-foreground-muted">
            <span>
              cpu <span className="text-foreground"><AnimatedNumber value={m.cpuPct} />%</span>
            </span>
            <span>
              lat <span className="text-foreground"><AnimatedNumber value={m.latencyMs} />ms</span>
            </span>
            <span
              className={tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : "text-success"}
            >
              <AnimatedNumber value={m.successPct} />%
            </span>
          </div>
        )}
        {building && <div className="mt-0.5 text-[9px] text-warning">building image…</div>}
        {data.containerized && !building && (
          <div className="mt-0.5 text-[9px] uppercase tracking-widest text-accent">containerized</div>
        )}
      </Plate>
    }>
      <ApiServerBody tone={bodyTone} containerized={!!data.containerized} building={building} />
    </Assembly>
  );
}

function ZoneNode({ label, kind }: { label: string; kind: NodeKind }) {
  return (
    <div
      className={`zone-3d h-full w-full rounded-2xl border border-dashed ${
        kind === "vpc" ? "border-accent-2/40" : kind === "subnet-private" ? "border-border" : "border-accent/30"
      }`}
    >
      <span
        className={`ml-3 mt-2 inline-block font-mono text-[10px] uppercase tracking-widest ${
          kind === "vpc" ? "text-accent-2/80" : "text-foreground-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function SimNode({ id, data }: NodeProps<SimNodeType>) {
  switch (data.kind) {
    case "server":
      return <ServerNode id={id} data={data} />;
    case "client":
      return (
        <Assembly bodyH={90} hasTarget={false} plate={<Plate label={data.label} tone="success" />}>
          <ClientBody />
        </Assembly>
      );
    case "loadbalancer":
      return (
        <Assembly w={120} bodyH={80} plate={<Plate label={data.label} tone="success" brand="elb">
          <div className="mt-0.5 text-[9px] text-foreground-muted">round-robin</div>
        </Plate>}>
          <LoadBalancerBody />
        </Assembly>
      );
    case "database":
      return (
        <Assembly w={130} bodyH={95} hasSource={true} plate={<Plate label={data.label} tone="success" brand="postgres" />}>
          <DatabaseBody />
        </Assembly>
      );
    case "redis":
      return (
        <Assembly w={120} bodyH={70} plate={<Plate label={data.label} tone="success" brand="redis">
          <div className="mt-0.5 text-[9px] text-foreground-muted">in-memory cache</div>
        </Plate>}>
          <RedisBody />
        </Assembly>
      );
    case "rabbitmq":
      return (
        <Assembly w={170} bodyH={80} plate={<Plate label={data.label} tone="success" brand="rabbitmq">
          <div className="mt-0.5 text-[9px] text-foreground-muted">message broker</div>
        </Plate>}>
          <QueueBody />
        </Assembly>
      );
    case "worker":
      return (
        <Assembly w={100} bodyH={65} hasSource={false} plate={<Plate label={data.label} tone="success" />}>
          <WorkerBody hue={data.hue ?? "rgba(56,189,248,0.4)"} />
        </Assembly>
      );
    case "provider":
      return (
        <Assembly w={140} bodyH={90} plate={<Plate label={data.label} tone="warning">
          <div className="mt-0.5 text-[9px] text-foreground-muted">3rd-party · outside VPC</div>
        </Plate>}>
          <ProviderBody />
        </Assembly>
      );
    case "gateway":
      return (
        <Assembly w={110} bodyH={85} plate={<Plate label={data.label} tone="success" />}>
          <GatewayBody />
        </Assembly>
      );
    case "vpc":
    case "subnet-public":
    case "subnet-private":
      return <ZoneNode label={data.label} kind={data.kind} />;
    default:
      return <Assembly plate={<Plate label={data.label} />}>{null}</Assembly>;
  }
}
