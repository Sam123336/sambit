import type { Node, Edge } from "@xyflow/react";

export type NodeKind =
  | "client"
  | "server"
  | "loadbalancer"
  | "database"
  | "redis"
  | "rabbitmq"
  | "worker"
  | "provider"
  | "gateway"
  | "vpc"
  | "subnet-public"
  | "subnet-private";

export interface SimNodeData extends Record<string, unknown> {
  kind: NodeKind;
  label: string;
  capacity?: number;
  containerized?: boolean;
  buildStatus?: "idle" | "building" | "built";
  locked?: boolean;
  /** worker accent hue, provider flags, etc. */
  hue?: string;
}

export type SimNode = Node<SimNodeData>;
export type SimEdge = Edge;

export type PacketVariant =
  | "request"
  | "hit"
  | "miss"
  | "ws"
  | "webhook"
  | "queue"
  | "blocked";

export interface PacketBurst {
  id: string;
  fromId: string;
  toId: string;
  variant?: PacketVariant;
  color?: string;
  duration?: number;
  blocked?: boolean;
}

export interface TrayItem {
  kind: NodeKind;
  label: string;
  hint: string;
}

export const MISSIONS = [
  { n: 1, title: "Scale the API" },
  { n: 2, title: "Containerize it" },
  { n: 3, title: "Design the network" },
  { n: 4, title: "Make it fast" },
  { n: 5, title: "Make it realtime" },
  { n: 6, title: "Process a payment" },
  { n: 7, title: "Decouple the system" },
] as const;

import type { BrandName } from "./three/BrandLogo";

export interface Topic {
  key: string;
  tag: string;
  brand: BrandName;
  title: string;
  desc: string;
  mission?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  sql?: boolean;
}

export const TOPICS: Topic[] = [
  { key: "scale", tag: "LB", brand: "elb", title: "Scaling & Load Balancing", desc: "Crash a server with 10,000 users, then save it.", mission: 1 },
  { key: "docker", tag: "DKR", brand: "docker", title: "Docker & Containers", desc: "Watch the app get sealed inside a container.", mission: 2 },
  { key: "network", tag: "VPC", brand: "vpc", title: "VPC & Networking", desc: "Build the boundary. Block the internet from your DB.", mission: 3 },
  { key: "redis", tag: "RDS", brand: "redis", title: "Redis Caching", desc: "912ms → 97ms. Cache miss, cache hit.", mission: 4 },
  { key: "ws", tag: "WSS", brand: "socketio", title: "WebSockets & Realtime", desc: "Kill polling with a persistent push tether.", mission: 5 },
  { key: "payments", tag: "API", brand: "razorpay", title: "Payments, Webhooks & Idempotency", desc: "3rd-party APIs, webhooks back, charge exactly once.", mission: 6 },
  { key: "rabbitmq", tag: "MQ", brand: "rabbitmq", title: "RabbitMQ & Async Work", desc: "Decouple a 2.8s request down to 92ms.", mission: 7 },
  { key: "sql", tag: "SQL", brand: "postgres", title: "SQL Query Playground", desc: "Query the live simulation database, psql-style.", sql: true },
];

export const TRAY_BY_MISSION: Record<number, TrayItem[]> = {
  1: [
    { kind: "server", label: "Server", hint: "Adds compute capacity" },
    { kind: "loadbalancer", label: "Load Balancer", hint: "Routes traffic across servers" },
  ],
  3: [
    { kind: "gateway", label: "Internet Gateway", hint: "Entry point to the VPC" },
    { kind: "subnet-public", label: "Public Subnet", hint: "Internet-facing zone" },
    { kind: "subnet-private", label: "Private Subnet", hint: "Isolated zone" },
    { kind: "vpc", label: "VPC", hint: "Wraps the subnets" },
  ],
  4: [{ kind: "redis", label: "Redis", hint: "In-memory cache" }],
  7: [{ kind: "rabbitmq", label: "RabbitMQ", hint: "Message broker + workers" }],
};
