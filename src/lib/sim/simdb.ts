// In-memory database the missions mutate and the SQL panel queries.

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export interface SimDb {
  orders: Row[];
  payments: Row[];
  cache_entries: Row[];
  webhook_events: Row[];
}

export const TABLE_NAMES = ["orders", "payments", "cache_entries", "webhook_events"] as const;

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
  };
}
