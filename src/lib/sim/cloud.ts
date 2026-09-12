// Pure logic for the cloud missions: Kubernetes autoscaling, SQS redrive, EventBridge rules.
// Shared by the playground store and its self-check.

// ---------------------------------------------------------------------------
// Kubernetes — Horizontal Pod Autoscaler

export const HPA_TARGET_CPU = 70; // the utilization the control loop steers toward
export const HPA_MIN_PODS = 2;
export const HPA_MAX_PODS = 8;

/**
 * One HPA control-loop tick: desired = ceil(current * currentCPU / targetCPU).
 * Real clusters run this every ~15s, which is why scaling arrives in steps
 * rather than all at once.
 */
export function desiredReplicas(
  current: number,
  currentCpuPct: number,
  targetCpuPct: number = HPA_TARGET_CPU,
  min: number = HPA_MIN_PODS,
  max: number = HPA_MAX_PODS,
): number {
  if (current <= 0) return min;
  const desired = Math.ceil(current * (currentCpuPct / targetCpuPct));
  return Math.min(max, Math.max(min, desired));
}

// ---------------------------------------------------------------------------
// SQS — visibility timeout, receive count, dead-letter redrive

export const MAX_RECEIVE_COUNT = 3; // redrive policy: maxReceiveCount

export type QueueStatus = "visible" | "in-flight" | "dlq" | "deleted";

export interface QueueMsg {
  id: string;
  body: string;
  receive_count: number;
  status: QueueStatus;
}

/** A consumer polls the queue: the message goes invisible to everyone else. */
export function receiveMessage(m: QueueMsg): QueueMsg {
  return { ...m, status: "in-flight", receive_count: m.receive_count + 1 };
}

/**
 * The consumer died without deleting it. The visibility timeout expires and the
 * message comes back — forever, unless a dead-letter queue catches it once it
 * has been received more than maxReceiveCount times.
 */
export function releaseMessage(m: QueueMsg, hasDlq: boolean): QueueMsg {
  if (hasDlq && m.receive_count >= MAX_RECEIVE_COUNT) return { ...m, status: "dlq" };
  return { ...m, status: "visible" };
}

/** Processed successfully — the consumer deletes it, which is the only way out. */
export function ackMessage(m: QueueMsg): QueueMsg {
  return { ...m, status: "deleted" };
}

/** A message stuck on the retry carousel with nowhere to land is a poison pill. */
export function isPoisoned(m: QueueMsg, hasDlq: boolean): boolean {
  return !hasDlq && m.receive_count >= MAX_RECEIVE_COUNT && m.status !== "deleted";
}

// ---------------------------------------------------------------------------
// EventBridge — one bus, pattern-matched rules, many targets

export interface EventRule {
  name: string;
  /** matches event.source, or "*" for any */
  source: string;
  /** matches event.detailType, or "*" for any */
  detailType: string;
  targets: string[];
}

export interface BusEvent {
  source: string;
  detailType: string;
}

function patternMatches(pattern: string, value: string) {
  return pattern === "*" || pattern === value;
}

/**
 * Fan-out is decided by the bus, not the producer: publish once, every rule whose
 * pattern matches delivers to its targets. Adding a consumer = adding a rule.
 */
export function matchTargets(evt: BusEvent, rules: EventRule[]): string[] {
  const hit = rules.filter(
    (r) => patternMatches(r.source, evt.source) && patternMatches(r.detailType, evt.detailType),
  );
  return [...new Set(hit.flatMap((r) => r.targets))];
}
