// Runnable check: `npx tsx src/lib/sim/cloud.selfcheck.ts`
import {
  desiredReplicas,
  receiveMessage,
  releaseMessage,
  ackMessage,
  isPoisoned,
  matchTargets,
  HPA_MAX_PODS,
  MAX_RECEIVE_COUNT,
  type QueueMsg,
  type EventRule,
} from "./cloud";
import { computeServerMetrics, aggregateMetrics, distributeTraffic, SERVER_CAPACITY, SURGE_TRAFFIC } from "./engine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

// ---- HPA ------------------------------------------------------------------

assert(desiredReplicas(2, 35) === 2, "a cluster under target does not scale below the floor");
assert(desiredReplicas(2, 99) === 3, "pinned cpu scales 2 pods up one step");
assert(desiredReplicas(4, 140) === 8, "runaway cpu is capped at the max replica count");

// The control loop converges: keep ticking until the surge is absorbed.
let pods = 2;
let ticks = 0;
for (; ticks < 12; ticks++) {
  const loads = distributeTraffic(SURGE_TRAFFIC, pods, true);
  const agg = aggregateMetrics(loads.map((l) => computeServerMetrics(l, SERVER_CAPACITY)));
  if (agg.successPct >= 99 && agg.cpuPct <= 70) break;
  const next = desiredReplicas(pods, agg.cpuPct);
  if (next === pods) break;
  pods = next;
}
assert(pods > 2 && pods <= HPA_MAX_PODS, `hpa converged to ${pods} pods for the 10k surge`);
assert(ticks < 12, "hpa converges rather than oscillating forever");
const settled = aggregateMetrics(
  distributeTraffic(SURGE_TRAFFIC, pods, true).map((l) => computeServerMetrics(l, SERVER_CAPACITY)),
);
assert(settled.successPct === 100, "the scaled deployment serves the surge cleanly");

// ---- SQS ------------------------------------------------------------------

const fresh: QueueMsg = { id: "msg_9c1", body: "charge order 43", receive_count: 0, status: "visible" };

let m = receiveMessage(fresh);
assert(m.status === "in-flight" && m.receive_count === 1, "receive hides the message and counts the delivery");
assert(ackMessage(m).status === "deleted", "acking is the only way a message leaves the queue");

// Worker keeps crashing, no DLQ: the message returns forever.
m = fresh;
for (let i = 0; i < MAX_RECEIVE_COUNT + 2; i++) m = releaseMessage(receiveMessage(m), false);
assert(m.status === "visible", "without a dlq a failing message keeps coming back");
assert(isPoisoned(m, false), "a message past maxReceiveCount with no dlq is a poison pill");

// Same crashes with a DLQ wired up: it gets quarantined on the maxReceiveCount-th failure.
m = fresh;
let movedOn = 0;
for (let i = 1; i <= MAX_RECEIVE_COUNT + 2 && m.status !== "dlq"; i++) {
  m = releaseMessage(receiveMessage(m), true);
  movedOn = i;
}
assert(m.status === "dlq", "the redrive policy moves the poison pill to the dead-letter queue");
assert(movedOn === MAX_RECEIVE_COUNT, `it took exactly maxReceiveCount (${MAX_RECEIVE_COUNT}) failures`);
assert(!isPoisoned(m, true), "a quarantined message no longer poisons the queue");

// ---- EventBridge ----------------------------------------------------------

const rules: EventRule[] = [
  { name: "notify-customer", source: "order.api", detailType: "order.placed", targets: ["EMAIL"] },
  { name: "fulfilment", source: "order.api", detailType: "order.placed", targets: ["WAREHOUSE", "EMAIL"] },
  { name: "analytics-firehose", source: "order.api", detailType: "*", targets: ["ANALYTICS"] },
  { name: "refunds", source: "payments.api", detailType: "payment.refunded", targets: ["LEDGER"] },
];

const placed = matchTargets({ source: "order.api", detailType: "order.placed" }, rules);
assert(placed.length === 3, "one publish fans out to every matching rule's targets");
assert(new Set(placed).size === placed.length, "a target subscribed twice is still delivered once");
assert(placed.includes("ANALYTICS"), "a wildcard detail-type rule matches too");
assert(
  matchTargets({ source: "order.api", detailType: "order.cancelled" }, rules).join() === "ANALYTICS",
  "a non-matching detail type only reaches the wildcard rule",
);
assert(matchTargets({ source: "unknown.api", detailType: "order.placed" }, rules).length === 0, "an unmatched source reaches nobody");

// Adding a consumer is a new rule — the producer's event is untouched.
const extended = matchTargets({ source: "order.api", detailType: "order.placed" }, [
  ...rules,
  { name: "loyalty", source: "order.api", detailType: "order.placed", targets: ["LOYALTY"] },
]);
assert(extended.length === placed.length + 1, "a new rule adds a consumer with no producer change");

console.log("all cloud self-checks passed");
