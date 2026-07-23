// Runnable check: `npx tsx src/lib/sim/engine.selfcheck.ts`
import {
  computeServerMetrics,
  distributeTraffic,
  aggregateMetrics,
  SERVER_CAPACITY,
  BASELINE_TRAFFIC,
  SURGE_TRAFFIC,
} from "./engine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

const baseline = computeServerMetrics(BASELINE_TRAFFIC, SERVER_CAPACITY);
assert(baseline.healthy, "baseline traffic on one server is healthy");
assert(baseline.successPct === 100, "baseline success is 100%");

const overloaded = computeServerMetrics(SURGE_TRAFFIC, SERVER_CAPACITY);
assert(!overloaded.healthy, "surge traffic on one server is unhealthy");
assert(overloaded.cpuPct >= 95, "surge traffic pins cpu near 99%");
assert(overloaded.successPct < 50, "surge traffic tanks success rate");

// Adding a second server without a load balancer shouldn't help — it stays unrouted.
const unroutedLoads = distributeTraffic(SURGE_TRAFFIC, 2, false);
assert(unroutedLoads[1] === 0, "unrouted second server gets no traffic");
const unroutedMetrics = unroutedLoads.map((l) => computeServerMetrics(l, SERVER_CAPACITY));
assert(!unroutedMetrics[0].healthy, "primary server still overloaded without LB");

// Enough servers behind a load balancer resolves the incident.
const routedLoads = distributeTraffic(SURGE_TRAFFIC, 5, true);
const routedMetrics = routedLoads.map((l) => computeServerMetrics(l, SERVER_CAPACITY));
assert(
  routedMetrics.every((m) => m.healthy),
  "five servers behind a load balancer absorb the surge",
);

const agg = aggregateMetrics(routedMetrics);
assert(agg.successPct === 100, "aggregate success reflects resolved incident");

console.log("all engine self-checks passed");
