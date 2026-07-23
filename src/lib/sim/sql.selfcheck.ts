// Runnable check: `npx tsx src/lib/sim/sql.selfcheck.ts`
import { createSimDb } from "./simdb";
import { runSql } from "./sql";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

const db = createSimDb();
db.payments.push({ id: "pay_1", order_id: 42, amount: 310, status: "captured", idempotency_key: "evt_1a2b" });
db.webhook_events.push(
  { id: "evt_1a2b", type: "payment.success", status: "processed" },
  { id: "evt_1a2b", type: "payment.success", status: "duplicate-ignored" },
);

let r = runSql("SELECT * FROM orders", db);
assert(!("error" in r) && r.rows.length === 3, "select * returns all orders");

r = runSql("select id, item from orders where status = 'delivered' order by id desc limit 1", db);
assert(!("error" in r) && r.rows.length === 1 && r.rows[0].id === 41, "where + order by desc + limit");
assert(!("error" in r) && Object.keys(r.rows[0]).length === 2, "column projection");

r = runSql("SELECT * FROM orders WHERE amount > 200 AND status = 'preparing'", db);
assert(!("error" in r) && r.rows.length === 1 && r.rows[0].id === 42, "AND conditions with numeric compare");

r = runSql("SELECT * FROM orders WHERE item LIKE '%dosa%'", db);
assert(!("error" in r) && r.rows.length === 1, "LIKE with wildcards, case-insensitive");

r = runSql("SELECT * FROM payments", db);
assert(!("error" in r) && r.rows.length === 1, "payments has exactly one row (idempotency)");

r = runSql("SELECT * FROM webhook_events WHERE status = 'duplicate-ignored'", db);
assert(!("error" in r) && r.rows.length === 1, "duplicate webhook delivery is visible");

r = runSql("DROP TABLE orders", db);
assert("error" in r, "non-SELECT rejected");

r = runSql("SELECT * FROM users", db);
assert("error" in r, "unknown table rejected");

console.log("all sql self-checks passed");
