"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useSimStore } from "@/store/simStore";
import { MISSIONS } from "./types";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

function Objective({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground-muted">{children}</p>;
}

function ActionButton({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`mt-3 mr-2 cursor-pointer rounded-md border px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
        primary
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-border bg-surface text-foreground-muted hover:border-accent/50 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Banner({ tone, children }: { tone: "critical" | "success" | "warning" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "critical"
      ? "border-critical/40 bg-critical/10 text-critical"
      : tone === "success"
        ? "border-success/40 bg-success/10 text-success"
        : tone === "info"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-warning/40 bg-warning/10 text-warning";
  return <div className={`mt-3 rounded-md border px-3 py-2 font-mono text-xs leading-relaxed ${cls}`}>{children}</div>;
}

function LatencyBadge({ ms }: { ms: number }) {
  const tone = ms <= 150 ? "text-success" : ms <= 1000 ? "text-warning" : "text-critical";
  return (
    <span className={`ml-2 font-mono text-sm tabular-nums ${tone}`}>{ms.toLocaleString()}ms</span>
  );
}

function Log({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);
  if (lines.length === 0) return null;
  return (
    <div ref={ref} className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-bg/70 p-2.5 font-mono text-[10px] leading-relaxed text-foreground-muted">
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.startsWith("✕") || line.startsWith("🔥")
              ? "text-critical"
              : line.startsWith("✓")
                ? "text-success"
                : line.startsWith("↻") || line.startsWith("⇢") || line.startsWith("⇠") || line.startsWith("+")
                  ? "text-accent"
                  : ""
          }
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function ContinueButton() {
  const advanceMission = useSimStore((s) => s.advanceMission);
  return (
    <ActionButton primary onClick={advanceMission}>
      Continue →
    </ActionButton>
  );
}

// --- missions --------------------------------------------------------------

function Mission1() {
  const phase = useSimStore((s) => s.m1Phase);
  const sendSurge = useSimStore((s) => s.sendSurge);
  const serverCount = useSimStore((s) => s.nodes.filter((n) => n.data.kind === "server").length);
  return (
    <motion.div key="m1" {...fadeUp}>
      <Objective>Keep the service alive.</Objective>
      {phase === "idle" && (
        <ActionButton primary onClick={sendSurge}>
          🔥 Send 10,000 Users
        </ActionButton>
      )}
      {phase === "overloaded" && (
        <>
          <Banner tone="critical">🔥 Overloaded — drag in a Server and a Load Balancer</Banner>
          {serverCount > 1 && (
            <p className="mt-2 text-xs text-foreground-muted">
              More servers alone won&apos;t help — nothing routes traffic to them yet.
            </p>
          )}
        </>
      )}
      {phase === "resolved" && (
        <>
          <Banner tone="success">✓ Incident resolved — load balanced across the fleet</Banner>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission2() {
  const phase = useSimStore((s) => s.m2Phase);
  const containerizeApp = useSimStore((s) => s.containerizeApp);
  return (
    <motion.div key="m2" {...fadeUp}>
      <Objective>Deploy to a new server. Make the application portable.</Objective>
      {phase === "deploy-failed" && (
        <>
          <Banner tone="critical">
            Deployment failed
            <br />· Node version mismatch
            <br />· Missing dependency
            <br />· Environment mismatch
          </Banner>
          <ActionButton primary onClick={containerizeApp}>
            + Containerize the app
          </ActionButton>
        </>
      )}
      {phase === "building" && <Banner tone="warning">Building image… watch the container seal the app</Banner>}
      {phase === "deployed" && (
        <>
          <Banner tone="success">
            ✓ Image created
            <br />✓ Container started — app sealed in glass
            <br />✓ Port 3000 exposed
          </Banner>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission3() {
  const phase = useSimStore((s) => s.m3Phase);
  const attemptDirectDb = useSimStore((s) => s.attemptDirectDb);
  const dbAttempt = useSimStore((s) => s.dbAttempt);
  return (
    <motion.div key="m3" {...fadeUp}>
      <Objective>Protect the system without taking it offline.</Objective>
      {phase === "exposed" && <Banner tone="critical">⚠ Everything public</Banner>}
      {phase === "secured" && <Banner tone="success">✓ Private resources protected</Banner>}
      <p className="mt-2 text-xs text-foreground-muted">
        Drag in a Gateway, both Subnets, and a VPC to build the boundary.
      </p>
      <ActionButton onClick={attemptDirectDb}>Try: Internet → Database</ActionButton>
      {dbAttempt.status === "blocked" && <Banner tone="critical">✕ Blocked — private resource</Banner>}
      {dbAttempt.status === "reached" && <Banner tone="warning">⚠ Reached the database directly — no boundary</Banner>}
      {phase === "secured" && <ContinueButton />}
    </motion.div>
  );
}

function Mission4() {
  const phase = useSimStore((s) => s.m4Phase);
  const latency = useSimStore((s) => s.m4LastLatency);
  const m4Request = useSimStore((s) => s.m4Request);
  return (
    <motion.div key="m4" {...fadeUp}>
      <Objective>Customers are leaving. Make this faster.</Objective>
      <ActionButton primary onClick={m4Request}>
        GET /products
      </ActionButton>
      {latency !== null && (
        <div className="mt-2 font-mono text-xs text-foreground-muted">
          last response
          <LatencyBadge ms={latency} />
        </div>
      )}
      {phase === "slow" && (
        <Banner tone="critical">Every request hits Postgres. Drag in Redis between the API and the database.</Banner>
      )}
      {phase === "cold" && <Banner tone="info">Cache is empty — send the request again and watch the MISS path.</Banner>}
      {phase === "warm" && (
        <Banner tone="warning">CACHE MISS → wrote products:list to Redis. One more request…</Banner>
      )}
      {phase === "resolved" && (
        <>
          <Banner tone="success">⚡ CACHE HIT — 912ms → 97ms</Banner>
          <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Sambit · production story</p>
            <p className="mt-1.5 text-xs text-foreground-muted">
              I solved this exact problem at BelivMart — route serviceability API from ~900ms to ~100ms with Redis
              caching + query optimization.
            </p>
            <Link href="/work" className="mt-1.5 inline-block font-mono text-[10px] uppercase tracking-widest text-accent underline underline-offset-4">
              Explore case study →
            </Link>
          </div>
          <p className="mt-2 font-mono text-[10px] text-foreground-muted">
            sql&gt; SELECT * FROM cache_entries
          </p>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission5() {
  const phase = useSimStore((s) => s.m5Phase);
  const polls = useSimStore((s) => s.m5PollCount);
  const start = useSimStore((s) => s.m5StartTracking);
  const upgrade = useSimStore((s) => s.m5Upgrade);
  const ship = useSimStore((s) => s.m5Ship);
  return (
    <motion.div key="m5" {...fadeUp}>
      <Objective>The customer wants live order tracking.</Objective>
      {phase === "idle" && (
        <ActionButton primary onClick={start}>
          Track order #42
        </ActionButton>
      )}
      {phase === "polling" && (
        <>
          <Banner tone="warning">
            Client polls GET /order/42 every second…
            <br />
            <span className="tabular-nums">{polls}</span> requests, 0 updates. There must be a better way.
          </Banner>
          {polls >= 4 && (
            <ActionButton primary onClick={upgrade}>
              Upgrade to WebSocket
            </ActionButton>
          )}
        </>
      )}
      {phase === "socketed" && (
        <>
          <Banner tone="info">WSS connected — persistent tether, zero polling.</Banner>
          <ActionButton primary onClick={ship}>
            Ship the order
          </ActionButton>
        </>
      )}
      {phase === "resolved" && (
        <>
          <Banner tone="success">
            ⚡ order.updated pushed instantly
            <br />
            {polls} wasted polls → 1 pushed event
          </Banner>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission6() {
  const phase = useSimStore((s) => s.m6Phase);
  const log = useSimStore((s) => s.m6Log);
  const pay = useSimStore((s) => s.m6Pay);
  const webhook = useSimStore((s) => s.m6Webhook);
  const retry = useSimStore((s) => s.m6Retry);
  return (
    <motion.div key="m6" {...fadeUp}>
      <Objective>Take a payment through a third party — and survive their retries.</Objective>
      {phase === "idle" && (
        <ActionButton primary onClick={pay}>
          Customer pays ₹310
        </ActionButton>
      )}
      {phase === "initiated" && (
        <ActionButton primary onClick={webhook}>
          Provider confirms → webhook
        </ActionButton>
      )}
      {phase === "paid" && (
        <ActionButton primary onClick={retry}>
          Provider retries the same webhook
        </ActionButton>
      )}
      <Log lines={log} />
      {phase === "resolved" && (
        <>
          <Banner tone="success">Idempotency key did its job — charged exactly once.</Banner>
          <p className="mt-2 font-mono text-[10px] text-foreground-muted">sql&gt; SELECT * FROM payments</p>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission7() {
  const phase = useSimStore((s) => s.m7Phase);
  const latency = useSimStore((s) => s.m7LastLatency);
  const order = useSimStore((s) => s.m7Order);
  return (
    <motion.div key="m7" {...fadeUp}>
      <Objective>Order placement does everything synchronously. Decouple it.</Objective>
      <ActionButton primary onClick={order}>
        Place order
      </ActionButton>
      {latency !== null && (
        <div className="mt-2 font-mono text-xs text-foreground-muted">
          response time
          <LatencyBadge ms={latency} />
        </div>
      )}
      {phase === "sync" && (
        <Banner tone="critical">
          payment → notify → rider → analytics, all before responding.
          <br />
          Drag in RabbitMQ to decouple.
        </Banner>
      )}
      {phase === "queued" && <Banner tone="info">Broker wired — place the order again.</Banner>}
      {phase === "resolved" && (
        <>
          <Banner tone="success">
            ⚡ 2,800ms → 92ms — API responds instantly while workers consume the queue.
          </Banner>
          <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Sambit · production story</p>
            <p className="mt-1.5 text-xs text-foreground-muted">
              Redis, RabbitMQ, webhooks, idempotency — this is the shape of the async pipeline I run in production at
              BelivMart.
            </p>
            <Link href="/work" className="mt-1.5 inline-block font-mono text-[10px] uppercase tracking-widest text-accent underline underline-offset-4">
              See the engineering stories →
            </Link>
          </div>
          <ContinueButton />
        </>
      )}
    </motion.div>
  );
}

function Mission8() {
  const phase = useSimStore((s) => s.m8Phase);
  const log = useSimStore((s) => s.m8Log);
  const pods = useSimStore((s) => s.nodes.filter((n) => n.data.kind === "server").length);
  const killPod = useSimStore((s) => s.k8sKillPod);
  const surge = useSimStore((s) => s.k8sSurge);
  return (
    <motion.div key="m8" {...fadeUp}>
      <Objective>Containers are easy. Keeping them running at 3am is not.</Objective>
      {(phase === "idle" || phase === "crashed") && (
        <ActionButton primary onClick={killPod}>
          💀 Kill a pod
        </ActionButton>
      )}
      {phase === "crashed" && (
        <Banner tone="critical">
          Pod gone. The Service stopped routing to it — no user saw a 500.
          <br />
          The control plane is comparing actual state to desired state…
        </Banner>
      )}
      {phase === "healed" && (
        <>
          <Banner tone="success">✓ Self-healed — desired replicas restored, nobody paged.</Banner>
          <ActionButton primary onClick={surge}>
            🔥 Send 10,000 Users
          </ActionButton>
          <ActionButton onClick={killPod}>Kill another</ActionButton>
        </>
      )}
      {phase === "overloaded" && (
        <Banner tone="warning">
          CPU above the 70% target. The HPA is doing the math you used to do by hand…
        </Banner>
      )}
      {phase === "scaled" && (
        <>
          <Banner tone="success">
            ⚡ Autoscaled to {pods} pods — traffic absorbed without a deploy, a ticket, or a human.
          </Banner>
          <p className="mt-2 text-xs text-foreground-muted">
            desired = ceil(replicas × currentCPU ÷ targetCPU), re-evaluated every control loop.
          </p>
          <ContinueButton />
        </>
      )}
      <Log lines={log} />
    </motion.div>
  );
}

function Mission9() {
  const phase = useSimStore((s) => s.m9Phase);
  const log = useSimStore((s) => s.m9Log);
  const stages = useSimStore((s) => s.ciStages);
  const manual = useSimStore((s) => s.ciManualDeploy);
  const push = useSimStore((s) => s.ciPush);
  const running = stages.some((st) => st.status === "run");
  return (
    <motion.div key="m9" {...fadeUp}>
      <Objective>Get code to production without praying.</Objective>
      {phase === "idle" && (
        <ActionButton primary onClick={manual}>
          Deploy it by hand
        </ActionButton>
      )}
      {phase === "broken" && (
        <>
          <Banner tone="critical">
            You shipped straight to prod. No build, no tests, no rollback.
          </Banner>
          <p className="mt-2 text-xs text-foreground-muted">
            Drag in the CI/CD Pipeline — the only path to prod from here on.
          </p>
        </>
      )}
      {phase !== "idle" && phase !== "broken" && (
        <div className="mt-3 flex gap-1.5 font-mono text-[10px]">
          {stages.map((st) => (
            <span
              key={st.name}
              className={`rounded border px-1.5 py-0.5 uppercase tracking-widest ${
                st.status === "pass"
                  ? "border-success/40 bg-success/10 text-success"
                  : st.status === "fail"
                    ? "border-critical/40 bg-critical/10 text-critical"
                    : st.status === "run"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-border text-foreground-muted"
              }`}
            >
              {st.name}
            </span>
          ))}
        </div>
      )}
      {phase === "piped" && !running && (
        <ActionButton primary onClick={() => push(false)}>
          git push · the fix
        </ActionButton>
      )}
      {phase === "green" && !running && (
        <>
          <Banner tone="success">✓ Green build shipped itself — same steps, every single time.</Banner>
          <ActionButton primary onClick={() => push(true)}>
            git push · a broken commit
          </ActionButton>
        </>
      )}
      {phase === "caught" && !running && (
        <>
          <Banner tone="success">
            ✕ Tests failed → deploy never ran. Prod is still serving v1.4.2.
            <br />
            That failure cost 31 seconds instead of a 14-minute outage.
          </Banner>
          <p className="mt-2 font-mono text-[10px] text-foreground-muted">sql&gt; SELECT * FROM deployments</p>
          <ActionButton onClick={() => push(false)}>Push a good commit again</ActionButton>
          <ContinueButton />
        </>
      )}
      <Log lines={log} />
    </motion.div>
  );
}

function Mission10() {
  const phase = useSimStore((s) => s.m10Phase);
  const msg = useSimStore((s) => s.m10Msg);
  const log = useSimStore((s) => s.m10Log);
  const send = useSimStore((s) => s.sqsSend);
  const crash = useSimStore((s) => s.sqsCrashWorker);
  return (
    <motion.div key="m10" {...fadeUp}>
      <Objective>A worker dies holding your message. Don&apos;t lose it — and don&apos;t loop forever.</Objective>
      {phase === "idle" && (
        <ActionButton primary onClick={send}>
          Send order to the queue
        </ActionButton>
      )}
      {msg && (
        <div className="mt-2 font-mono text-xs text-foreground-muted">
          msg_9c1 · receive_count
          <span className={`ml-1.5 tabular-nums ${msg.receive_count >= 3 ? "text-critical" : "text-warning"}`}>
            {msg.receive_count}
          </span>
          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
            {msg.status}
          </span>
        </div>
      )}
      {phase !== "idle" && phase !== "resolved" && (
        <ActionButton primary onClick={crash}>
          💀 Worker crashes mid-message
        </ActionButton>
      )}
      {phase === "inflight" && (
        <Banner tone="info">In flight. The message is invisible to other consumers, not deleted.</Banner>
      )}
      {phase === "retrying" && (
        <Banner tone="warning">
          The visibility timeout expired and the message came back. At-least-once delivery: your consumer must be
          idempotent — same lesson as the payment webhook.
        </Banner>
      )}
      {phase === "poisoned" && (
        <>
          <Banner tone="critical">
            ☠ Poison pill — 3 deliveries, 3 crashes, and it will keep coming back forever, burning a worker every
            time.
          </Banner>
          <p className="mt-2 text-xs text-foreground-muted">
            Drag in a Dead Letter Queue, then crash the worker once more.
          </p>
        </>
      )}
      {phase === "resolved" && (
        <>
          <Banner tone="success">
            ✓ Redrive policy fired — the bad message sits in orders-dlq for a human, the queue keeps flowing.
          </Banner>
          <p className="mt-2 font-mono text-[10px] text-foreground-muted">sql&gt; SELECT * FROM queue_messages</p>
          <ContinueButton />
        </>
      )}
      <Log lines={log} />
    </motion.div>
  );
}

function Mission11() {
  const phase = useSimStore((s) => s.m11Phase);
  const rules = useSimStore((s) => s.m11Rules);
  const log = useSimStore((s) => s.m11Log);
  const direct = useSimStore((s) => s.ebDirectCall);
  const publish = useSimStore((s) => s.ebPublish);
  const addConsumer = useSimStore((s) => s.ebAddConsumer);
  return (
    <motion.div key="m11" {...fadeUp}>
      <Objective>Three services need to know about every order. Stop calling them.</Objective>
      {(phase === "idle" || phase === "coupled") && (
        <ActionButton primary onClick={direct}>
          Place an order
        </ActionButton>
      )}
      {phase === "coupled" && (
        <>
          <Banner tone="critical">
            One slow consumer took checkout down with it. Every new consumer is another deploy of the order service.
          </Banner>
          <p className="mt-2 text-xs text-foreground-muted">Drag in the EventBridge Bus.</p>
        </>
      )}
      {(phase === "bussed" || phase === "published" || phase === "resolved") && (
        <>
          <ActionButton primary onClick={publish}>
            Publish order.placed
          </ActionButton>
          <div className="mt-3 space-y-1 rounded-md border border-border bg-bg/70 p-2.5 font-mono text-[10px] text-foreground-muted">
            {rules.map((r) => (
              <div key={r.name}>
                <span className="text-accent">{r.name}</span> · {r.source} / {r.detailType} → {r.targets.length} target
              </div>
            ))}
          </div>
        </>
      )}
      {phase === "published" && (
        <>
          <Banner tone="success">
            ⚡ One PutEvents call, {rules.length} rules matched, 3 targets delivered — the API never learned their names.
          </Banner>
          <ActionButton primary onClick={addConsumer}>
            Marketing wants loyalty points
          </ActionButton>
        </>
      )}
      {phase === "resolved" && (
        <>
          <Banner tone="success">
            ✓ New consumer added as a rule. Zero producer changes, zero deploys, zero downtime.
          </Banner>
          <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Tour complete · 11 missions</p>
            <p className="mt-1.5 text-xs text-foreground-muted">
              Load balancing, Docker, VPCs, Redis, WebSockets, payments, RabbitMQ, Kubernetes, CI/CD, SQS and
              EventBridge — the same stack I build and operate in production.
            </p>
            <Link href="/work" className="mt-1.5 inline-block font-mono text-[10px] uppercase tracking-widest text-accent underline underline-offset-4">
              See the engineering stories →
            </Link>
          </div>
          <p className="mt-2 font-mono text-[10px] text-foreground-muted">sql&gt; SELECT * FROM events</p>
        </>
      )}
      <Log lines={log} />
    </motion.div>
  );
}

const PANELS: Record<number, () => React.ReactNode> = {
  1: Mission1,
  2: Mission2,
  3: Mission3,
  4: Mission4,
  5: Mission5,
  6: Mission6,
  7: Mission7,
  8: Mission8,
  9: Mission9,
  10: Mission10,
  11: Mission11,
};

export default function MissionPanel() {
  const mission = useSimStore((s) => s.mission);
  const setPicker = useSimStore((s) => s.setPicker);
  const Panel = PANELS[mission];
  const title = MISSIONS.find((m) => m.n === mission)?.title ?? "";

  return (
    <div className="node-3d pointer-events-auto absolute left-3 top-3 z-30 max-h-[55dvh] w-[calc(100%-1.5rem)] max-w-80 overflow-y-auto rounded-xl border border-border p-4 backdrop-blur sm:left-4 sm:top-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          Mission {String(mission).padStart(2, "0")}
        </p>
        <button
          onClick={() => setPicker(true)}
          className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-foreground-muted hover:text-accent lg:hidden"
        >
          topics
        </button>
      </div>
      <h2 className="mt-1 text-sm font-semibold">{title}</h2>
      <div className="mt-3">
        <AnimatePresence mode="wait">
          <Panel key={mission} />
        </AnimatePresence>
      </div>
    </div>
  );
}
