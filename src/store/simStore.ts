import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import {
  computeServerMetrics,
  distributeTraffic,
  aggregateMetrics,
  SERVER_CAPACITY,
  BASELINE_TRAFFIC,
  SURGE_TRAFFIC,
} from "@/lib/sim/engine";
import { createSimDb, type SimDb } from "@/lib/sim/simdb";
import {
  desiredReplicas,
  receiveMessage,
  releaseMessage,
  isPoisoned,
  matchTargets,
  HPA_TARGET_CPU,
  HPA_MAX_PODS,
  MAX_RECEIVE_COUNT,
  type QueueMsg,
  type EventRule,
} from "@/lib/sim/cloud";
import type { StageStatus } from "@/components/playground/three/NodeBodies";
import type { NodeKind, SimNode, SimEdge, PacketBurst } from "@/components/playground/types";

export type Mission = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type M1Phase = "idle" | "overloaded" | "resolved";
export type M2Phase = "idle" | "deploy-failed" | "building" | "deployed";
export type M3Phase = "idle" | "exposed" | "secured";
export type M4Phase = "idle" | "slow" | "cold" | "warm" | "resolved";
export type M5Phase = "idle" | "polling" | "socketed" | "resolved";
export type M6Phase = "idle" | "initiated" | "paid" | "resolved";
export type M7Phase = "idle" | "sync" | "queued" | "resolved";
export type M8Phase = "idle" | "crashed" | "healed" | "overloaded" | "scaled";
export type M9Phase = "idle" | "broken" | "piped" | "green" | "caught";
export type M10Phase = "idle" | "inflight" | "retrying" | "poisoned" | "resolved";
export type M11Phase = "idle" | "coupled" | "bussed" | "published" | "resolved";

export interface CiStage {
  name: string;
  status: StageStatus;
}

const CI_STAGES: CiStage[] = [
  { name: "build", status: "idle" },
  { name: "test", status: "idle" },
  { name: "deploy", status: "idle" },
];

/** EventBridge rules for mission 11 — the bus, not the producer, decides fan-out. */
const EVENT_RULES: EventRule[] = [
  { name: "notify-customer", source: "order.api", detailType: "order.placed", targets: ["worker-1"] },
  { name: "fulfilment", source: "order.api", detailType: "order.placed", targets: ["worker-2"] },
  { name: "analytics-firehose", source: "order.api", detailType: "*", targets: ["worker-3"] },
];

interface DbAttempt {
  status: "idle" | "blocked" | "reached";
  nonce: number;
}

type ChainLeg = Omit<PacketBurst, "id">;

interface SimState {
  nodes: SimNode[];
  edges: SimEdge[];
  traffic: number;
  mission: Mission;
  maxMission: Mission;
  m1Phase: M1Phase;
  m2Phase: M2Phase;
  m3Phase: M3Phase;
  m4Phase: M4Phase;
  m4LastLatency: number | null;
  m5Phase: M5Phase;
  m5PollCount: number;
  m6Phase: M6Phase;
  m6Log: string[];
  m7Phase: M7Phase;
  m7LastLatency: number | null;
  m8Phase: M8Phase;
  m8Log: string[];
  m9Phase: M9Phase;
  m9Log: string[];
  ciStages: CiStage[];
  m10Phase: M10Phase;
  m10Msg: QueueMsg | null;
  m10Log: string[];
  m11Phase: M11Phase;
  m11Rules: EventRule[];
  m11Log: string[];
  dbAttempt: DbAttempt;
  packets: PacketBurst[];
  db: SimDb;
  sqlOpen: boolean;
  pickerOpen: boolean;
  setPicker: (open: boolean) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (kind: NodeKind) => void;
  firePackets: (bursts: ChainLeg[]) => void;
  fireChain: (legs: ChainLeg[]) => void;
  setMission: (m: Mission) => void;
  advanceMission: () => void;
  toggleSql: () => void;

  sendSurge: () => void;
  containerizeApp: () => void;
  attemptDirectDb: () => void;
  m4Request: () => void;
  m5StartTracking: () => void;
  m5Upgrade: () => void;
  m5Ship: () => void;
  m6Pay: () => void;
  m6Webhook: () => void;
  m6Retry: () => void;
  m7Order: () => void;
  k8sKillPod: () => void;
  k8sSurge: () => void;
  ciManualDeploy: () => void;
  ciPush: (broken: boolean) => void;
  sqsSend: () => void;
  sqsCrashWorker: () => void;
  ebDirectCall: () => void;
  ebPublish: () => void;
  ebAddConsumer: () => void;
}

// ---------------------------------------------------------------------------
// helpers

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Missions 8-11 animate over several seconds; switching missions must cancel them.
let missionTimers: ReturnType<typeof setTimeout>[] = [];

function later(fn: () => void, ms: number) {
  missionTimers.push(setTimeout(fn, ms));
}

function clearMissionTimers() {
  missionTimers.forEach(clearTimeout);
  missionTimers = [];
}

/** Pods/servers that are actually schedulable — a crashed pod takes no traffic. */
function healthyServers(nodes: SimNode[]) {
  return serverNodes(nodes).filter((n) => !n.data.down);
}

function podName() {
  return `POD · api-${Math.random().toString(36).slice(2, 6)}`;
}

// pods fill a 2-wide grid, so scaling to the replica ceiling still fits on screen
const POD_X = 560;
const POD_Y = 60;
const POD_COL = 210;
const POD_ROW = 150;

function podSlot(i: number) {
  return { x: POD_X + (i % 2) * POD_COL, y: POD_Y + Math.floor(i / 2) * POD_ROW };
}

const KIND_LABEL: Record<NodeKind, string> = {
  client: "USERS",
  server: "SERVER",
  loadbalancer: "LOAD BALANCER",
  database: "POSTGRES",
  redis: "REDIS",
  rabbitmq: "RABBITMQ",
  worker: "WORKER",
  provider: "PAYMENTS INC",
  gateway: "GATEWAY",
  vpc: "VPC",
  "subnet-public": "PUBLIC SUBNET",
  "subnet-private": "PRIVATE SUBNET",
  "control-plane": "CONTROL PLANE",
  git: "REPO",
  pipeline: "CI/CD PIPELINE",
  sqs: "ORDERS-QUEUE",
  dlq: "ORDERS-DLQ",
  eventbus: "EVENT BUS",
};

function mkNode(
  id: string,
  kind: NodeKind,
  x: number,
  y: number,
  extra: Partial<SimNode["data"]> = {},
): SimNode {
  return {
    id,
    type: "sim",
    position: { x, y },
    data: { kind, label: KIND_LABEL[kind], ...extra },
  };
}

function serverData(containerized: boolean) {
  return {
    capacity: SERVER_CAPACITY,
    containerized,
    buildStatus: containerized ? ("built" as const) : ("idle" as const),
  };
}

function edge(source: string, target: string, className?: string): SimEdge {
  return { id: `${source}-${target}`, source, target, className };
}

function serverNodes(nodes: SimNode[]) {
  return nodes.filter((n) => n.data.kind === "server");
}

function hasLoadBalancer(nodes: SimNode[]) {
  return nodes.some((n) => n.data.kind === "loadbalancer");
}

function rewireForLoadBalancer(nodes: SimNode[], edges: SimEdge[]): SimEdge[] {
  const kept = edges.filter((e) => !(e.source === "client" && e.target.startsWith("server")));
  const withClientToLb = kept.some((e) => e.id === "client-loadbalancer-1")
    ? kept
    : [...kept, edge("client", "loadbalancer-1")];
  const lbEdges = serverNodes(nodes).map((s) => edge("loadbalancer-1", s.id));
  return [...withClientToLb.filter((e) => !e.id.startsWith("loadbalancer-1-")), ...lbEdges];
}

// ponytail: fixed-width zone layout assumes <=3 servers survive mission 1 —
// upgrade to a measured/dynamic layout if the sandbox later allows more.
const M3_SERVER_X = 460;
const M3_SERVER_SPACING = 170;
const M3_SERVER_Y = 360;

function applyMission3Layout(nodes: SimNode[]): SimNode[] {
  const servers = serverNodes(nodes);
  const privateWidth = Math.max(440, M3_SERVER_SPACING * (servers.length + 1) + 140);
  const databaseX = M3_SERVER_X + servers.length * M3_SERVER_SPACING;
  const serverIndex = new Map(servers.map((s, i) => [s.id, i]));

  return nodes.map((n) => {
    switch (n.data.kind) {
      case "client":
        return { ...n, position: { x: 0, y: 280 } };
      case "gateway":
        return { ...n, position: { x: 210, y: 280 } };
      case "loadbalancer":
        return { ...n, position: { x: 580, y: 130 } };
      case "server":
        return {
          ...n,
          position: { x: M3_SERVER_X + (serverIndex.get(n.id) ?? 0) * M3_SERVER_SPACING, y: M3_SERVER_Y },
        };
      case "database":
        return { ...n, position: { x: databaseX, y: M3_SERVER_Y } };
      case "subnet-public":
        return { ...n, position: { x: 360, y: 60 }, width: privateWidth, height: 160, zIndex: -2 };
      case "subnet-private":
        return { ...n, position: { x: 360, y: 280 }, width: privateWidth, height: 260, zIndex: -2 };
      case "vpc":
        return { ...n, position: { x: 330, y: 30 }, width: privateWidth + 60, height: 540, zIndex: -3 };
      default:
        return n;
    }
  });
}

function networkPiecesComplete(nodes: SimNode[]) {
  const kinds = new Set(nodes.map((n) => n.data.kind));
  return kinds.has("gateway") && kinds.has("vpc") && kinds.has("subnet-public") && kinds.has("subnet-private");
}

function deriveM1Phase(nodes: SimNode[], traffic: number, current: M1Phase): M1Phase {
  if (traffic < SURGE_TRAFFIC) return current === "resolved" ? current : "idle";
  const servers = healthyServers(nodes);
  const loads = distributeTraffic(traffic, servers.length, hasLoadBalancer(nodes));
  const agg = aggregateMetrics(loads.map((l) => computeServerMetrics(l, SERVER_CAPACITY)));
  return agg.successPct >= 99 ? "resolved" : "overloaded";
}

// ---------------------------------------------------------------------------
// per-mission stages — every mission is independently enterable/replayable

function stage(m: Mission): { nodes: SimNode[]; edges: SimEdge[] } {
  switch (m) {
    case 1:
      return {
        nodes: [
          mkNode("client", "client", 30, 170),
          mkNode("server-1", "server", 420, 160, { label: "APP", ...serverData(false), locked: true }),
        ],
        edges: [edge("client", "server-1")],
      };
    case 2:
      return {
        nodes: [
          mkNode("client", "client", 0, 170),
          mkNode("loadbalancer-1", "loadbalancer", 230, 165),
          mkNode("server-1", "server", 470, 40, { label: "APP", ...serverData(false) }),
          mkNode("server-2", "server", 470, 300, serverData(false)),
        ],
        edges: [edge("client", "loadbalancer-1"), edge("loadbalancer-1", "server-1"), edge("loadbalancer-1", "server-2")],
      };
    case 3:
      return {
        nodes: applyMission3Layout([
          mkNode("client", "client", 0, 0),
          mkNode("loadbalancer-1", "loadbalancer", 0, 0),
          mkNode("server-1", "server", 0, 0, { label: "APP", ...serverData(true) }),
          mkNode("server-2", "server", 0, 0, serverData(true)),
          mkNode("database-1", "database", 0, 0),
        ]),
        edges: [
          edge("client", "loadbalancer-1"),
          edge("loadbalancer-1", "server-1"),
          edge("loadbalancer-1", "server-2"),
          edge("server-1", "database-1"),
        ],
      };
    case 4:
      return {
        nodes: [
          mkNode("client", "client", 10, 180),
          mkNode("server-1", "server", 330, 170, { label: "API", ...serverData(true) }),
          mkNode("database-1", "database", 660, 170),
        ],
        edges: [edge("client", "server-1"), edge("server-1", "database-1")],
      };
    case 5:
      return {
        nodes: [
          mkNode("client", "client", 40, 175),
          mkNode("server-1", "server", 450, 165, { label: "API", ...serverData(true) }),
        ],
        edges: [edge("client", "server-1")],
      };
    case 6:
      return {
        nodes: [
          mkNode("client", "client", 10, 260),
          mkNode("server-1", "server", 340, 250, { label: "API", ...serverData(true) }),
          mkNode("database-1", "database", 680, 250),
          mkNode("provider-1", "provider", 360, 20),
        ],
        edges: [
          edge("client", "server-1"),
          edge("server-1", "database-1"),
          { ...edge("server-1", "provider-1", "provider-edge"), animated: false },
        ],
      };
    case 7:
      return {
        nodes: [
          mkNode("client", "client", 20, 180),
          mkNode("server-1", "server", 340, 170, { label: "API", ...serverData(true) }),
        ],
        edges: [edge("client", "server-1")],
      };
    case 8:
      return {
        nodes: [
          mkNode("client", "client", 0, 210),
          mkNode("control-plane-1", "control-plane", 280, 10),
          mkNode("loadbalancer-1", "loadbalancer", 280, 205, { label: "SERVICE" }),
          mkNode("server-1", "server", POD_X, POD_Y, {
            label: "POD · api-7f3k",
            ...serverData(true),
            brand: "kubernetes",
            restarts: 0,
          }),
          mkNode("server-2", "server", POD_X + POD_COL, POD_Y, {
            label: "POD · api-b2c9",
            ...serverData(true),
            brand: "kubernetes",
            restarts: 0,
          }),
        ],
        edges: [
          edge("client", "loadbalancer-1"),
          edge("loadbalancer-1", "server-1"),
          edge("loadbalancer-1", "server-2"),
          edge("control-plane-1", "server-1", "control-edge"),
          edge("control-plane-1", "server-2", "control-edge"),
        ],
      };
    case 9:
      return {
        nodes: [
          mkNode("git-1", "git", 0, 190, { sub: "main" }),
          mkNode("server-1", "server", 700, 180, {
            label: "PROD",
            ...serverData(true),
            sub: "v1.4.1 · healthy",
          }),
        ],
        edges: [edge("git-1", "server-1", "manual-edge")],
      };
    case 10:
      return {
        nodes: [
          mkNode("client", "client", 0, 210),
          mkNode("server-1", "server", 270, 200, { label: "API", ...serverData(true) }),
          mkNode("sqs-1", "sqs", 590, 205),
          mkNode("worker-1", "worker", 900, 205, { label: "BILLING", hue: "rgba(231,21,123,0.4)" }),
        ],
        edges: [
          edge("client", "server-1"),
          edge("server-1", "sqs-1", "queue-edge"),
          edge("sqs-1", "worker-1", "queue-edge"),
        ],
      };
    case 11:
      return {
        nodes: [
          mkNode("client", "client", 0, 240),
          mkNode("server-1", "server", 250, 230, { label: "ORDER API", ...serverData(true) }),
          mkNode("worker-1", "worker", 780, 60, { label: "EMAIL", hue: "rgba(56,189,248,0.4)" }),
          mkNode("worker-2", "worker", 780, 230, { label: "WAREHOUSE", hue: "rgba(34,197,94,0.4)" }),
          mkNode("worker-3", "worker", 780, 400, { label: "ANALYTICS", hue: "rgba(139,92,246,0.4)" }),
        ],
        edges: [
          edge("client", "server-1"),
          edge("server-1", "worker-1"),
          edge("server-1", "worker-2"),
          edge("server-1", "worker-3"),
        ],
      };
  }
}

function phaseResetFor(m: Mission): Partial<SimState> {
  return {
    m1Phase: m === 1 ? "idle" : "resolved",
    m2Phase: m === 2 ? "deploy-failed" : "idle",
    m3Phase: m === 3 ? "exposed" : "idle",
    m4Phase: "idle",
    m4LastLatency: null,
    m5Phase: "idle",
    m5PollCount: 0,
    m6Phase: "idle",
    m6Log: [],
    m7Phase: "idle",
    m7LastLatency: null,
    m8Phase: "idle",
    m8Log: [],
    m9Phase: "idle",
    m9Log: [],
    ciStages: CI_STAGES,
    m10Phase: "idle",
    m10Msg: null,
    m10Log: [],
    m11Phase: "idle",
    m11Rules: EVENT_RULES,
    m11Log: [],
    dbAttempt: { status: "idle", nonce: 0 },
    traffic: BASELINE_TRAFFIC,
    packets: [],
  };
}

// ---------------------------------------------------------------------------

export const useSimStore = create<SimState>((set, get) => ({
  nodes: stage(1).nodes,
  edges: stage(1).edges,
  traffic: BASELINE_TRAFFIC,
  mission: 1,
  // all topics are freely explorable — the rail is a menu, not a gate
  maxMission: 11,
  m1Phase: "idle",
  m2Phase: "idle",
  m3Phase: "idle",
  m4Phase: "idle",
  m4LastLatency: null,
  m5Phase: "idle",
  m5PollCount: 0,
  m6Phase: "idle",
  m6Log: [],
  m7Phase: "idle",
  m7LastLatency: null,
  m8Phase: "idle",
  m8Log: [],
  m9Phase: "idle",
  m9Log: [],
  ciStages: CI_STAGES,
  m10Phase: "idle",
  m10Msg: null,
  m10Log: [],
  m11Phase: "idle",
  m11Rules: EVENT_RULES,
  m11Log: [],
  dbAttempt: { status: "idle", nonce: 0 },
  packets: [],
  db: createSimDb(),
  sqlOpen: false,
  pickerOpen: true,
  setPicker: (open) => set({ pickerOpen: open }),

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as SimNode[] })),

  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  toggleSql: () => set((s) => ({ sqlOpen: !s.sqlOpen })),

  firePackets: (bursts) =>
    set((state) => {
      const withIds = bursts.map((b, i) => ({
        ...b,
        id: `pkt-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      }));
      const ids = withIds.map((b) => b.id);
      const maxDuration = Math.max(0.9, ...withIds.map((b) => b.duration ?? 0.9));
      setTimeout(() => {
        set((s) => ({ packets: s.packets.filter((p) => !ids.includes(p.id)) }));
      }, maxDuration * 1000 + 700);
      return { packets: [...state.packets, ...withIds] };
    }),

  fireChain: (legs) => {
    let delayS = 0;
    legs.forEach((leg) => {
      const d = leg.duration ?? 0.45;
      setTimeout(() => get().firePackets([{ ...leg, duration: d }]), delayS * 1000);
      delayS += d;
    });
  },

  setMission: (m) =>
    set((state) => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      clearMissionTimers();
      const s = stage(m);
      const db = state.db;
      // deterministic replays: reset the tables the mission writes
      if (m <= 4) db.cache_entries = [];
      if (m <= 6) {
        db.payments = [];
        db.webhook_events = [];
        db.orders = db.orders.filter((o) => o.id !== 43).map((o) => (o.id === 42 ? { ...o, status: "preparing" } : o));
      }
      db.deployments = db.deployments.filter((d) => d.id === 1);
      db.queue_messages = [];
      db.events = [];
      return {
        ...phaseResetFor(m),
        mission: m,
        maxMission: (m > state.maxMission ? m : state.maxMission) as Mission,
        nodes: s.nodes,
        edges: s.edges,
        db: { ...db },
      };
    }),

  advanceMission: () => {
    const { mission } = get();
    if (mission < 11) get().setMission((mission + 1) as Mission);
  },

  addNode: (kind) =>
    set((state) => {
      const countOfKind = state.nodes.filter((n) => n.data.kind === kind).length;
      const singleton = [
        "loadbalancer",
        "gateway",
        "vpc",
        "database",
        "redis",
        "rabbitmq",
        "provider",
        "control-plane",
        "git",
        "pipeline",
        "sqs",
        "dlq",
        "eventbus",
      ].includes(kind);
      const id = singleton ? `${kind}-1` : `${kind}-${countOfKind + 1}`;
      if (state.nodes.some((n) => n.id === id)) return state;

      let nodes = [...state.nodes];
      let edges = [...state.edges];
      const patch: Partial<SimState> = {};

      switch (kind) {
        case "server": {
          nodes.push(
            mkNode(id, "server", 460 + (countOfKind % 3) * 40, 340 + Math.floor(countOfKind / 3) * 130, serverData(false)),
          );
          if (hasLoadBalancer(nodes)) edges = rewireForLoadBalancer(nodes, edges);
          break;
        }
        case "loadbalancer": {
          nodes.push(mkNode(id, "loadbalancer", 230, 165));
          edges = rewireForLoadBalancer(nodes, edges);
          break;
        }
        case "gateway":
        case "vpc":
        case "subnet-public":
        case "subnet-private": {
          nodes.push(mkNode(id, kind, 40, 40));
          nodes = applyMission3Layout(nodes);
          if (networkPiecesComplete(nodes)) patch.m3Phase = "secured";
          break;
        }
        case "redis": {
          nodes.push(mkNode(id, "redis", 500, 30));
          edges.push(edge("server-1", "redis-1", "cache-edge"));
          if (state.mission === 4 && (state.m4Phase === "idle" || state.m4Phase === "slow")) {
            patch.m4Phase = "cold";
          }
          break;
        }
        case "rabbitmq": {
          nodes.push(mkNode(id, "rabbitmq", 640, 170));
          nodes.push(mkNode("worker-1", "worker", 940, 40, { label: "NOTIFY", hue: "rgba(56,189,248,0.4)" }));
          nodes.push(mkNode("worker-2", "worker", 940, 180, { label: "RIDER", hue: "rgba(34,197,94,0.4)" }));
          nodes.push(mkNode("worker-3", "worker", 940, 320, { label: "ANALYTICS", hue: "rgba(139,92,246,0.4)" }));
          edges.push(
            edge("server-1", "rabbitmq-1", "queue-edge"),
            edge("rabbitmq-1", "worker-1", "queue-edge"),
            edge("rabbitmq-1", "worker-2", "queue-edge"),
            edge("rabbitmq-1", "worker-3", "queue-edge"),
          );
          if (state.mission === 7 && state.m7Phase !== "resolved") patch.m7Phase = "queued";
          break;
        }
        case "pipeline": {
          // the pipeline sits between the repo and prod — no more hand-deploys
          nodes.push(mkNode(id, "pipeline", 360, 185, { sub: "build → test → deploy" }));
          edges = edges.filter((e) => e.id !== "git-1-server-1");
          edges.push(edge("git-1", "pipeline-1", "deploy-edge"), edge("pipeline-1", "server-1", "deploy-edge"));
          if (state.mission === 9) patch.m9Phase = "piped";
          break;
        }
        case "dlq": {
          nodes.push(mkNode(id, "dlq", 590, 420, { sub: `maxReceiveCount ${MAX_RECEIVE_COUNT}` }));
          edges.push(edge("sqs-1", "dlq-1", "dlq-edge"));
          break;
        }
        case "eventbus": {
          nodes.push(mkNode(id, "eventbus", 520, 225, { sub: `${state.m11Rules.length} rules` }));
          // the producer stops calling consumers directly and just publishes
          edges = edges.filter((e) => e.source !== "server-1" || !e.target.startsWith("worker"));
          edges.push(edge("server-1", "eventbus-1", "event-edge"));
          state.nodes
            .filter((n) => n.data.kind === "worker")
            .forEach((w) => edges.push(edge("eventbus-1", w.id, "event-edge")));
          if (state.mission === 11) patch.m11Phase = "bussed";
          break;
        }
        default:
          return state;
      }

      if (state.mission === 1) {
        patch.m1Phase = deriveM1Phase(nodes, state.traffic, state.m1Phase);
        if (state.traffic >= SURGE_TRAFFIC) {
          const routed = hasLoadBalancer(nodes);
          const wave: ChainLeg[] = routed
            ? [
                ...Array.from({ length: 4 }, () => ({ fromId: "client", toId: "loadbalancer-1", duration: 0.5 })),
                ...serverNodes(nodes).flatMap((sv) =>
                  Array.from({ length: 3 }, () => ({ fromId: "loadbalancer-1", toId: sv.id, duration: 0.5 })),
                ),
              ]
            : Array.from({ length: 8 }, () => ({
                fromId: "client",
                toId: "server-1",
                duration: 0.6,
                variant: "blocked" as const,
              }));
          setTimeout(() => get().firePackets(wave), 0);
        }
      }

      return { ...patch, nodes, edges };
    }),

  // ---- mission 1 -----------------------------------------------------------
  sendSurge: () =>
    set((state) => {
      const m1Phase = deriveM1Phase(state.nodes, SURGE_TRAFFIC, state.m1Phase);
      setTimeout(
        () =>
          get().firePackets(
            Array.from({ length: 8 }, () => ({
              fromId: "client",
              toId: "server-1",
              duration: 0.6,
              variant: "blocked" as const,
            })),
          ),
        0,
      );
      return { traffic: SURGE_TRAFFIC, m1Phase };
    }),

  // ---- mission 2 -----------------------------------------------------------
  containerizeApp: () => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === "server-1" ? { ...n, data: { ...n.data, buildStatus: "building" } } : n,
      ),
      m2Phase: "building",
    }));
    setTimeout(() => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === "server-1" ? { ...n, data: { ...n.data, containerized: true, buildStatus: "built" } } : n,
        ),
        m2Phase: "deployed",
      }));
    }, 1500);
  },

  // ---- mission 3 -----------------------------------------------------------
  attemptDirectDb: () =>
    set((state) => {
      const blocked = state.m3Phase === "secured";
      setTimeout(
        () =>
          get().firePackets([
            { fromId: "client", toId: blocked ? "gateway-1" : "database-1", duration: 0.8, blocked, variant: blocked ? "blocked" : "request" },
          ]),
        0,
      );
      return { dbAttempt: { status: blocked ? "blocked" : "reached", nonce: state.dbAttempt.nonce + 1 } };
    }),

  // ---- mission 4: redis cache ---------------------------------------------
  m4Request: () => {
    const { m4Phase, fireChain, db } = get();
    if (m4Phase === "idle" || m4Phase === "slow") {
      fireChain([
        { fromId: "client", toId: "server-1" },
        { fromId: "server-1", toId: "database-1", duration: 0.9 },
        { fromId: "database-1", toId: "server-1", duration: 0.9 },
        { fromId: "server-1", toId: "client" },
      ]);
      set({ m4Phase: "slow", m4LastLatency: 912 });
    } else if (m4Phase === "cold") {
      fireChain([
        { fromId: "client", toId: "server-1" },
        { fromId: "server-1", toId: "redis-1", variant: "miss", duration: 0.35 },
        { fromId: "redis-1", toId: "server-1", variant: "miss", duration: 0.35 },
        { fromId: "server-1", toId: "database-1", duration: 0.8 },
        { fromId: "database-1", toId: "server-1", duration: 0.8 },
        { fromId: "server-1", toId: "redis-1", variant: "hit", duration: 0.35 },
        { fromId: "server-1", toId: "client" },
      ]);
      db.cache_entries.push({ key: "products:list", value: "[42 products]", ttl_s: 60, hits: 0 });
      set({ m4Phase: "warm", m4LastLatency: 871, db: { ...db } });
    } else {
      fireChain([
        { fromId: "client", toId: "server-1" },
        { fromId: "server-1", toId: "redis-1", variant: "hit", duration: 0.25 },
        { fromId: "redis-1", toId: "server-1", variant: "hit", duration: 0.25 },
        { fromId: "server-1", toId: "client", variant: "hit" },
      ]);
      db.cache_entries = db.cache_entries.map((r) =>
        r.key === "products:list" ? { ...r, hits: Number(r.hits) + 1 } : r,
      );
      set({ m4Phase: "resolved", m4LastLatency: 97, db: { ...db } });
    }
  },

  // ---- mission 5: websocket -----------------------------------------------
  m5StartTracking: () => {
    if (pollTimer) clearInterval(pollTimer);
    set({ m5Phase: "polling", m5PollCount: 0 });
    pollTimer = setInterval(() => {
      const s = get();
      if (s.m5Phase !== "polling") return;
      s.fireChain([
        { fromId: "client", toId: "server-1", duration: 0.4 },
        { fromId: "server-1", toId: "client", duration: 0.4 },
      ]);
      set({ m5PollCount: s.m5PollCount + 1 });
    }, 1000);
  },

  m5Upgrade: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set((state) => ({
      m5Phase: "socketed",
      edges: state.edges.map((e) =>
        e.id === "client-server-1" ? { ...e, className: "ws-tether" } : e,
      ),
    }));
  },

  m5Ship: () =>
    set((state) => {
      setTimeout(
        () => get().firePackets([{ fromId: "server-1", toId: "client", variant: "ws", duration: 0.5 }]),
        0,
      );
      const db = state.db;
      db.orders = db.orders.map((o) => (o.id === 42 ? { ...o, status: "out-for-delivery" } : o));
      return { m5Phase: "resolved", db: { ...db } };
    }),

  // ---- mission 6: payment + webhook + idempotency -------------------------
  m6Pay: () =>
    set((state) => {
      get().fireChain([
        { fromId: "client", toId: "server-1" },
        { fromId: "server-1", toId: "provider-1", duration: 0.6 },
        { fromId: "provider-1", toId: "server-1", duration: 0.6 },
      ]);
      const db = state.db;
      db.payments.push({ id: "pay_7f3k", order_id: 42, amount: 310, status: "pending", idempotency_key: null });
      return {
        m6Phase: "initiated",
        db: { ...db },
        m6Log: [...state.m6Log, "→ POST /payment (you → them)", "← payment_id pay_7f3k received"],
      };
    }),

  m6Webhook: () =>
    set((state) => {
      get().fireChain([
        { fromId: "provider-1", toId: "server-1", variant: "webhook", duration: 0.7 },
        { fromId: "server-1", toId: "database-1", duration: 0.4 },
      ]);
      const db = state.db;
      db.webhook_events.push({ id: "evt_1a2b", type: "payment.success", status: "processed" });
      db.payments = db.payments.map((p) =>
        p.id === "pay_7f3k" ? { ...p, status: "captured", idempotency_key: "evt_1a2b" } : p,
      );
      db.orders = db.orders.map((o) => (o.id === 42 ? { ...o, status: "paid" } : o));
      return {
        m6Phase: "paid",
        db: { ...db },
        m6Log: [
          ...state.m6Log,
          "⇠ webhook payment.success (them → you)",
          "✓ signature verified",
          "✓ evt_1a2b processed — order 42 PAID",
        ],
      };
    }),

  m6Retry: () =>
    set((state) => {
      get().fireChain([
        { fromId: "provider-1", toId: "server-1", variant: "webhook", duration: 0.7, blocked: true },
      ]);
      const db = state.db;
      db.webhook_events.push({ id: "evt_1a2b", type: "payment.success", status: "duplicate-ignored" });
      return {
        m6Phase: "resolved",
        db: { ...db },
        m6Log: [
          ...state.m6Log,
          "⇠ webhook payment.success (retry)",
          "✕ evt_1a2b already processed — ignored (idempotent)",
        ],
      };
    }),

  // ---- mission 7: rabbitmq ------------------------------------------------
  m7Order: () => {
    const { m7Phase, fireChain, db } = get();
    if (m7Phase === "idle" || m7Phase === "sync") {
      fireChain([
        { fromId: "client", toId: "server-1" },
        { fromId: "server-1", toId: "client", duration: 2.4 },
      ]);
      set({ m7Phase: "sync", m7LastLatency: 2800 });
    } else {
      fireChain([
        { fromId: "client", toId: "server-1", duration: 0.35 },
        { fromId: "server-1", toId: "client", duration: 0.35 },
      ]);
      // async fan-out rides the rail while the response is already back
      setTimeout(() => {
        get().fireChain([
          { fromId: "server-1", toId: "rabbitmq-1", variant: "queue", duration: 0.5 },
          { fromId: "rabbitmq-1", toId: "worker-1", variant: "queue", duration: 0.5 },
          { fromId: "rabbitmq-1", toId: "worker-2", variant: "queue", duration: 0.6 },
          { fromId: "rabbitmq-1", toId: "worker-3", variant: "queue", duration: 0.7 },
        ]);
      }, 350);
      db.orders = [
        ...db.orders.filter((o) => o.id !== 43),
        { id: 43, item: "Filter Coffee", amount: 80, status: "preparing", city: "Bengaluru" },
      ];
      set({ m7Phase: "resolved", m7LastLatency: 92, db: { ...db } });
    }
  },

  // ---- mission 8: kubernetes ----------------------------------------------
  k8sKillPod: () => {
    const victim = healthyServers(get().nodes).slice(-1)[0];
    if (!victim) return;

    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === victim.id ? { ...n, data: { ...n.data, down: true } } : n)),
      m8Phase: "crashed",
      m8Log: [...state.m8Log, `✕ ${victim.data.label} OOMKilled — liveness probe failing`],
    }));
    get().firePackets([{ fromId: "loadbalancer-1", toId: victim.id, variant: "blocked", duration: 0.5 }]);

    // the control loop notices and reschedules — nobody gets paged
    later(() => {
      get().firePackets([{ fromId: "control-plane-1", toId: victim.id, variant: "control", duration: 0.7 }]);
    }, 1000);
    later(() => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === victim.id
            ? { ...n, data: { ...n.data, down: false, restarts: (n.data.restarts ?? 0) + 1 } }
            : n,
        ),
        m8Phase: state.m8Phase === "crashed" ? "healed" : state.m8Phase,
        m8Log: [...state.m8Log, `↻ replacement pod Running — desired state restored in 1.8s`],
      }));
    }, 1900);
  },

  k8sSurge: () => {
    set((state) => ({
      traffic: SURGE_TRAFFIC,
      m8Phase: "overloaded",
      m8Log: [...state.m8Log, "🔥 10,000 req/s — pods above the 70% cpu target"],
    }));

    // one HPA control-loop tick: measure, compute desired replicas, schedule pods
    const tick = () => {
      const { nodes, traffic } = get();
      const pods = healthyServers(nodes);
      const agg = aggregateMetrics(
        distributeTraffic(traffic, pods.length, true).map((l) => computeServerMetrics(l, SERVER_CAPACITY)),
      );
      const want = desiredReplicas(pods.length, agg.cpuPct);

      if (want <= pods.length || pods.length >= HPA_MAX_PODS) {
        set((state) => ({
          m8Phase: agg.successPct >= 99 ? "scaled" : state.m8Phase,
          m8Log: [
            ...state.m8Log,
            agg.successPct >= 99
              ? `✓ steady state — ${pods.length} pods, cpu ${agg.cpuPct}% under the ${HPA_TARGET_CPU}% target`
              : `⚠ hit the ${HPA_MAX_PODS}-pod ceiling — raise maxReplicas or the node pool`,
          ],
        }));
        return;
      }

      set((state) => {
        const nextNodes = [...state.nodes];
        const nextEdges = [...state.edges];
        for (let i = pods.length; i < want; i++) {
          const id = `server-${serverNodes(nextNodes).length + 1}`;
          const slot = podSlot(i);
          nextNodes.push(
            mkNode(id, "server", slot.x, slot.y, {
              label: podName(),
              ...serverData(true),
              brand: "kubernetes",
              restarts: 0,
            }),
          );
          nextEdges.push(edge("loadbalancer-1", id), edge("control-plane-1", id, "control-edge"));
          later(() => get().firePackets([{ fromId: "control-plane-1", toId: id, variant: "control", duration: 0.6 }]), 60);
        }
        return {
          nodes: nextNodes,
          edges: nextEdges,
          m8Log: [
            ...state.m8Log,
            `hpa: cpu ${agg.cpuPct}% / target ${HPA_TARGET_CPU}% → scaling ${pods.length} → ${want} replicas`,
          ],
        };
      });

      later(tick, 1200);
    };

    later(tick, 900);
  },

  // ---- mission 9: ci/cd ---------------------------------------------------
  ciManualDeploy: () =>
    set((state) => {
      get().firePackets([{ fromId: "git-1", toId: "server-1", variant: "blocked", duration: 1 }]);
      return {
        m9Phase: "broken",
        nodes: state.nodes.map((n) =>
          n.id === "server-1" ? { ...n, data: { ...n.data, down: true, sub: "v2.0.0 · crashed" } } : n,
        ),
        m9Log: [
          ...state.m9Log,
          "$ scp -r dist/ prod:/srv/app && pm2 restart api",
          "✕ ReferenceError: STRIPE_KEY is not defined",
          "✕ prod down · 14 min · untested, unreviewed, unrollbackable",
        ],
      };
    }),

  ciPush: (broken) => {
    const commit = broken ? "9f2a1c7" : "3d8b41e";
    const message = broken ? "refactor checkout totals" : "fix: load STRIPE_KEY from env";
    set((state) => ({
      ciStages: CI_STAGES.map((st) => ({ ...st, status: "idle" as StageStatus })),
      m9Log: [...state.m9Log, `$ git push origin main   # ${commit} ${message}`],
    }));

    const DURATION = [900, 1100, 800];
    const runStage = (i: number) => {
      const failed = broken && i === 1; // the test stage is where a bad commit dies
      set((state) => ({ ciStages: state.ciStages.map((st, j) => (j === i ? { ...st, status: "run" } : st)) }));
      get().firePackets([
        { fromId: i === 0 ? "git-1" : "pipeline-1", toId: "pipeline-1", variant: "deploy", duration: 0.4 },
      ]);

      later(() => {
        set((state) => ({
          ciStages: state.ciStages.map((st, j) => (j === i ? { ...st, status: failed ? "fail" : "pass" } : st)),
          m9Log: [
            ...state.m9Log,
            failed
              ? "✕ test · 2 failing in checkout.spec.ts — pipeline stopped, prod untouched"
              : `✓ ${CI_STAGES[i].name} passed`,
          ],
        }));

        if (failed) {
          set((state) => {
            const db = state.db;
            db.deployments.push({
              id: db.deployments.length + 1,
              commit,
              message,
              stage: "test",
              status: "blocked",
              duration_s: 31,
            });
            return { m9Phase: "caught", db: { ...db } };
          });
          return;
        }

        if (i < CI_STAGES.length - 1) {
          runStage(i + 1);
          return;
        }

        // deploy stage passed: the pipeline, not a human, ships it
        get().firePackets([{ fromId: "pipeline-1", toId: "server-1", variant: "deploy", duration: 0.7 }]);
        set((state) => {
          const db = state.db;
          db.deployments.push({
            id: db.deployments.length + 1,
            commit,
            message,
            stage: "deploy",
            status: "deployed",
            duration_s: 68,
          });
          return {
            m9Phase: "green",
            db: { ...db },
            nodes: state.nodes.map((n) =>
              n.id === "server-1" ? { ...n, data: { ...n.data, down: false, sub: "v1.4.2 · healthy" } } : n,
            ),
            m9Log: [...state.m9Log, `✓ deployed ${commit} — green build, rollback is one revert away`],
          };
        });
      }, DURATION[i]);
    };

    later(() => runStage(0), 250);
  },

  // ---- mission 10: sqs, retries and dead letters ---------------------------
  sqsSend: () =>
    set((state) => {
      const msg: QueueMsg = { id: "msg_9c1", body: "charge order 43", receive_count: 0, status: "visible" };
      get().fireChain([
        { fromId: "client", toId: "server-1", duration: 0.35 },
        { fromId: "server-1", toId: "sqs-1", variant: "queue", duration: 0.5 },
      ]);
      const db = state.db;
      db.queue_messages = [{ ...msg }];
      return {
        m10Msg: msg,
        m10Phase: "inflight",
        db: { ...db },
        m10Log: [...state.m10Log, "→ SendMessage msg_9c1 · charge order 43 · 200 OK"],
      };
    }),

  sqsCrashWorker: () => {
    const { m10Msg, nodes } = get();
    if (!m10Msg || m10Msg.status === "dlq") return;
    const hasDlq = nodes.some((n) => n.data.kind === "dlq");
    const received = receiveMessage(m10Msg);

    get().fireChain([
      { fromId: "sqs-1", toId: "worker-1", variant: "queue", duration: 0.5 },
      { fromId: "worker-1", toId: "sqs-1", variant: "blocked", duration: 0.5, blocked: true },
    ]);
    set((state) => {
      const db = state.db;
      db.queue_messages = [{ ...received }];
      return {
        m10Msg: received,
        db: { ...db },
        m10Log: [
          ...state.m10Log,
          `← ReceiveMessage msg_9c1 · receive_count ${received.receive_count} · invisible for 30s`,
          "✕ worker OOMKilled before DeleteMessage",
        ],
      };
    });

    // visibility timeout expires: the message comes back, or gets redriven
    later(() => {
      const released = releaseMessage(received, hasDlq);
      if (released.status === "dlq") {
        get().firePackets([{ fromId: "sqs-1", toId: "dlq-1", variant: "event", duration: 0.7 }]);
      } else {
        get().firePackets([{ fromId: "sqs-1", toId: "sqs-1", variant: "queue", duration: 0.3 }]);
      }
      set((state) => {
        const db = state.db;
        db.queue_messages = [{ ...released }];
        return {
          m10Msg: released,
          db: { ...db },
          m10Phase:
            released.status === "dlq" ? "resolved" : isPoisoned(released, hasDlq) ? "poisoned" : "retrying",
          m10Log: [
            ...state.m10Log,
            released.status === "dlq"
              ? `⇢ redrive: receive_count ${released.receive_count} > maxReceiveCount ${MAX_RECEIVE_COUNT} → orders-dlq`
              : "⇠ visibility timeout expired — msg_9c1 is visible again",
          ],
        };
      });
    }, 1400);
  },

  // ---- mission 11: eventbridge --------------------------------------------
  ebDirectCall: () =>
    set((state) => {
      get().fireChain([
        { fromId: "client", toId: "server-1", duration: 0.35 },
        { fromId: "server-1", toId: "worker-1", duration: 0.4 },
        { fromId: "server-1", toId: "worker-2", duration: 0.4 },
        { fromId: "server-1", toId: "worker-3", variant: "blocked", duration: 0.9, blocked: true },
      ]);
      return {
        m11Phase: "coupled",
        m11Log: [
          ...state.m11Log,
          "POST /orders → 3 outbound HTTP calls, one after the other",
          "✕ analytics-svc timed out (5,000ms) — checkout failed with it",
          "the order service knows every consumer by hostname. 3 consumers, 3 ways to fail.",
        ],
      };
    }),

  ebPublish: () =>
    set((state) => {
      const targets = matchTargets({ source: "order.api", detailType: "order.placed" }, state.m11Rules).filter(
        (id) => state.nodes.some((n) => n.id === id),
      );
      get().fireChain([
        { fromId: "client", toId: "server-1", duration: 0.3 },
        { fromId: "server-1", toId: "eventbus-1", variant: "event", duration: 0.45 },
      ]);
      later(
        () =>
          get().firePackets(
            targets.map((t) => ({ fromId: "eventbus-1", toId: t, variant: "event" as const, duration: 0.55 })),
          ),
        780,
      );

      const db = state.db;
      db.events.push({
        id: `evt_${(db.events.length + 1).toString().padStart(3, "0")}`,
        source: "order.api",
        detail_type: "order.placed",
        matched_rules: state.m11Rules.length,
        targets: targets.length,
      });
      return {
        db: { ...db },
        m11Phase: state.m11Phase === "resolved" ? "resolved" : "published",
        m11Log: [
          ...state.m11Log,
          "→ PutEvents order.api · order.placed (one call, zero consumer hostnames)",
          `⇢ ${state.m11Rules.length} rules matched → ${targets.length} targets delivered`,
        ],
      };
    }),

  ebAddConsumer: () =>
    set((state) => {
      if (state.nodes.some((n) => n.id === "worker-4")) return state;
      return {
        nodes: [
          ...state.nodes.map((n) =>
            n.id === "eventbus-1" ? { ...n, data: { ...n.data, sub: `${state.m11Rules.length + 1} rules` } } : n,
          ),
          mkNode("worker-4", "worker", 780, 560, { label: "LOYALTY", hue: "rgba(251,191,36,0.4)" }),
        ],
        edges: [...state.edges, edge("eventbus-1", "worker-4", "event-edge")],
        m11Rules: [
          ...state.m11Rules,
          { name: "loyalty-points", source: "order.api", detailType: "order.placed", targets: ["worker-4"] },
        ],
        m11Phase: "resolved",
        m11Log: [
          ...state.m11Log,
          "+ rule loyalty-points → LOYALTY",
          "✓ order API unchanged, not redeployed, not even restarted",
        ],
      };
    }),
}));
