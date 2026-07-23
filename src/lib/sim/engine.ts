// Pure load-simulation math, shared by the playground store and HUD.
// utilization = load / capacity for a single server.

export const SERVER_CAPACITY = 3000; // req/s a single server node can handle
export const BASELINE_TRAFFIC = 3; // req/s at rest
export const SURGE_TRAFFIC = 10000; // req/s after "SEND 10,000 USERS"

export interface ServerMetrics {
  utilization: number;
  cpuPct: number;
  latencyMs: number;
  successPct: number;
  healthy: boolean;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function computeServerMetrics(load: number, capacity: number): ServerMetrics {
  const utilization = capacity > 0 ? load / capacity : 0;

  const cpuPct = clamp(Math.round(utilization * 70 + 15), 8, 99);

  const latencyMs =
    utilization <= 1
      ? Math.round(30 + utilization * 40)
      : Math.round(Math.min(3000, 70 + (utilization - 1) * 1490));

  const successPct =
    utilization <= 1
      ? 100
      : clamp(Math.round(100 - (utilization - 1) * 33), 5, 100);

  return {
    utilization,
    cpuPct,
    latencyMs,
    successPct,
    healthy: utilization <= 1 && successPct >= 99,
  };
}

/**
 * Splits `traffic` across `serverCount` servers. Without a load balancer,
 * everything routes to the first server and the rest sit idle — this is
 * what makes "just add another server" fail to fix an overload on its own.
 */
export function distributeTraffic(
  traffic: number,
  serverCount: number,
  routed: boolean,
): number[] {
  if (serverCount <= 0) return [];
  if (!routed) return [traffic, ...Array(serverCount - 1).fill(0)];
  const share = traffic / serverCount;
  return Array(serverCount).fill(share);
}

export function aggregateMetrics(perServer: ServerMetrics[]): {
  latencyMs: number;
  successPct: number;
  cpuPct: number;
} {
  if (perServer.length === 0) {
    return { latencyMs: 0, successPct: 100, cpuPct: 0 };
  }
  const active = perServer.filter((m) => m.utilization > 0);
  const pool = active.length > 0 ? active : perServer;
  const latencyMs = Math.round(
    pool.reduce((sum, m) => sum + m.latencyMs, 0) / pool.length,
  );
  const successPct = Math.round(
    pool.reduce((sum, m) => sum + m.successPct, 0) / pool.length,
  );
  const cpuPct = Math.max(...pool.map((m) => m.cpuPct));
  return { latencyMs, successPct, cpuPct };
}
