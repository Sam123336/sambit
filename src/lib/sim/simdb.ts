// In-memory database the missions mutate and the SQL panel queries.

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export interface SimDb {
  orders: Row[];
  payments: Row[];
  cache_entries: Row[];
  webhook_events: Row[];
  deployments: Row[];
  queue_messages: Row[];
  events: Row[];
}

export const TABLE_NAMES = [
  "orders",
  "payments",
  "cache_entries",
  "webhook_events",
  "deployments",
  "queue_messages",
  "events",
] as const;

export function createSimDb(): SimDb {
  return {
    orders: [
      { id: 40, item: "Paneer Tikka", amount: 240, status: "delivered", city: "Bengaluru" },
      { id: 41, item: "Masala Dosa", amount: 120, status: "delivered", city: "Bengaluru" },
      { id: 42, item: "Veg Biryani", amount: 310, status: "preparing", city: "Bengaluru" },
    ],
    payments: [],
    cache_entries: [],
    webhook_events: [],
    deployments: [{ id: 1, commit: "a41c0de", message: "bump copy", stage: "deploy", status: "deployed", duration_s: 74 }],
    queue_messages: [],
    events: [],
  };
}
