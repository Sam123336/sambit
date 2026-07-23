import { useMemo } from "react";
import { useSimStore } from "@/store/simStore";
import {
  computeServerMetrics,
  distributeTraffic,
  aggregateMetrics,
  SERVER_CAPACITY,
  type ServerMetrics,
} from "@/lib/sim/engine";

export function useMetrics() {
  const nodes = useSimStore((s) => s.nodes);
  const traffic = useSimStore((s) => s.traffic);

  return useMemo(() => {
    const servers = nodes.filter((n) => n.data.kind === "server");
    const routed = nodes.some((n) => n.data.kind === "loadbalancer");
    const loads = distributeTraffic(traffic, servers.length, routed);
    const perServer: Record<string, ServerMetrics> = {};
    servers.forEach((s, i) => {
      perServer[s.id] = computeServerMetrics(loads[i] ?? 0, SERVER_CAPACITY);
    });
    const aggregate = aggregateMetrics(Object.values(perServer));
    return { perServer, aggregate, routed, serverCount: servers.length };
  }, [nodes, traffic]);
}
